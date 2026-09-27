// Ajans iş hattı (supervisor → uzmanlar → supervisor → İNSAN ONAYI).
// Organizasyon başına kampanyalar sırayla işlenir ki ofisteki karakterler
// aynı anda tek bir işe odaklansın ve ekranda takip edilebilsin.
const { PIPELINE, COMMON_RULES, REVIEW_TASK, byId } = require('./agents');
const { runAgent } = require('./llm');
const { demoOutput } = require('./demo-writer');

const agentOf = (stepId) => stepId.split(':')[0];

function createPipeline({ db, cfg, client, publish, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const queues = new Map(); // orgId -> { running, items: [] }
  const mode = client ? 'ai' : 'demo';

  function log(orgId, campaignId, agentId, kind, text) {
    const at = Date.now();
    db.run('INSERT INTO activity (organization_id, campaign_id, agent_id, kind, text, at) VALUES (?,?,?,?,?,?)',
      [orgId, campaignId, agentId, kind, text, at]);
    publish(orgId, 'activity', { campaignId, agentId, kind, text, at });
  }

  function setStatus(orgId, id, status) {
    db.run('UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ? AND organization_id = ?',
      [status, Date.now(), id, orgId]);
    publish(orgId, 'campaign', { id, status });
  }

  const agentState = (orgId, agentId, state, line, campaignId) =>
    publish(orgId, 'agent', { agentId, state, line, campaignId });

  function buildPrompt({ p, c, prior }) {
    const project = [
      `Ad: ${p.name}`, `Açıklama: ${p.description || '[yok]'}`, `Hedef kitle: ${p.audience || '[yok]'}`,
      `Web: ${p.url || '[yok]'}`, `Ton: ${p.tone || '[yok]'}`,
    ].join('\n');
    const brief = [
      `Kampanya: ${c.title}`, `Amaç: ${c.goal || '[yok]'}`, `Kanallar: ${c.channels || '[yok]'}`,
      `Bütçe notu (kullanıcı girdisi): ${c.budget_note || '[yok]'}`,
      c.revision_note ? `KURUCUDAN REVİZYON NOTU (öncelikli uygula): ${c.revision_note}` : '',
    ].filter(Boolean).join('\n');
    const team = prior.map((d) =>
      `### ${byId(agentOf(d.agent_id)).role}: ${d.title}\n${String(d.body).slice(0, cfg.contextCharsPerDeliverable)}`).join('\n\n');
    return `<proje_bilgisi>\n${project}\n</proje_bilgisi>\n\n<brif>\n${brief}\n</brif>\n\n` +
      `<ekip_ciktilari>\n${team || 'Henüz yok — ilk adım sensin.'}\n</ekip_ciktilari>`;
  }

  async function produce(stepId, ctx) {
    const agent = byId(agentOf(stepId));
    if (!client) {
      await sleep(cfg.demoDelayMs);
      return demoOutput(stepId, ctx);
    }
    const task = stepId === 'mudur:review' ? REVIEW_TASK : agent.task;
    const system = `Sen ${agent.name}, ajansın ${agent.role}. ${agent.purpose}\n${COMMON_RULES}\n\n${task}`;
    return runAgent(client, cfg, { agentId: agent.id, system, prompt: buildPrompt(ctx) });
  }

  function saveDeliverable(orgId, c, stepId, out) {
    const data = out.visual ? JSON.stringify({ visual: out.visual }) : null;
    const extra = [
      out.highlights?.length ? `\n\n**Öne çıkanlar:** ${out.highlights.join(' · ')}` : '',
      out.open_questions?.length ? `\n\n**Açık sorular:**\n${out.open_questions.map((q) => `- ${q}`).join('\n')}` : '',
    ].join('');
    db.run(`INSERT INTO deliverables (organization_id, campaign_id, round, agent_id, title, body, data, confidence, created_at)
            VALUES (?,?,?,?,?,?,?,?,?)`,
      [orgId, c.id, c.round, stepId, out.title, out.body_markdown + extra, data, out.confidence, Date.now()]);
  }

  async function runStep(orgId, stepId, i, ctx) {
    const agentId = agentOf(stepId);
    const next = PIPELINE[i + 1] ? agentOf(PIPELINE[i + 1]) : null;
    agentState(orgId, agentId, 'thinking', stepId === 'mudur:review' ? 'Son kontrolü yapıyorum 🔍' : 'Brifi okuyorum…', ctx.c.id);
    await sleep(Math.min(800, cfg.demoDelayMs));
    agentState(orgId, agentId, 'working', 'Çalışıyorum…', ctx.c.id);
    const out = await produce(stepId, ctx);
    saveDeliverable(orgId, ctx.c, stepId, out);
    ctx.prior.push({ agent_id: stepId, title: out.title, body: out.body_markdown });
    agentState(orgId, agentId, 'done', out.status_line, ctx.c.id);
    log(orgId, ctx.c.id, agentId, 'deliverable', `${byId(agentId).name}: ${out.title}`);
    if (next) publish(orgId, 'handoff', { from: agentId, to: next, title: out.title, campaignId: ctx.c.id });
    await sleep(Math.min(1200, cfg.demoDelayMs));
  }

  async function execute(orgId, campaignId) {
    const c = db.one('SELECT * FROM campaigns WHERE id = ? AND organization_id = ?', [campaignId, orgId]);
    if (!c) return;
    const p = db.one('SELECT * FROM projects WHERE id = ? AND organization_id = ?', [c.project_id, orgId]);
    db.run('DELETE FROM deliverables WHERE campaign_id = ? AND round = ? AND organization_id = ?', [c.id, c.round, orgId]);
    db.run('UPDATE campaigns SET mode = ? WHERE id = ?', [mode, c.id]);
    setStatus(orgId, c.id, 'calisiyor');
    log(orgId, c.id, 'mudur', 'start', `“${c.title}” (${p.name}) üzerinde çalışma başladı — tur ${c.round}${mode === 'demo' ? ' · demo modu' : ''}`);
    const ctx = { p, c, prior: [] };
    try {
      for (let i = 0; i < PIPELINE.length; i++) await runStep(orgId, PIPELINE[i], i, ctx);
      setStatus(orgId, c.id, 'onay_bekliyor');
      agentState(orgId, 'mudur', 'waiting', 'Onayınızı bekliyoruz 🙌', c.id);
      log(orgId, c.id, 'mudur', 'approval', `“${c.title}” onayınıza sunuldu.`);
    } catch (err) {
      setStatus(orgId, c.id, 'hata');
      publish(orgId, 'agent', { agentId: 'all', state: 'idle' });
      log(orgId, c.id, 'mudur', 'error', `Çalışma durdu: ${err.message}`);
    }
  }

  async function drain(orgId) {
    const q = queues.get(orgId);
    if (q.running) return;
    q.running = true;
    while (q.items.length) await execute(orgId, q.items.shift());
    q.running = false;
  }

  function enqueue(orgId, campaignId) {
    if (!queues.has(orgId)) queues.set(orgId, { running: false, items: [] });
    const q = queues.get(orgId);
    if (!q.items.includes(campaignId)) q.items.push(campaignId);
    setStatus(orgId, campaignId, 'sirada');
    return drain(orgId);
  }

  // Sunucu yeniden başlarsa yarım kalan işleri kuyruğa geri al.
  function recover() {
    const rows = db.many("SELECT id, organization_id FROM campaigns WHERE status IN ('sirada','calisiyor') ORDER BY id");
    rows.forEach((r) => enqueue(r.organization_id, r.id));
    return rows.length;
  }

  const busy = (orgId) => Boolean(queues.get(orgId)?.running);

  return { enqueue, recover, busy, mode, buildPrompt };
}

module.exports = { createPipeline };
