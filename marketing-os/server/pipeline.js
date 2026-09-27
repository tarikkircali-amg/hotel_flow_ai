// Ajans iş hattı (supervisor → uzmanlar → supervisor → İNSAN ONAYI).
// Organizasyon başına kampanyalar sırayla işlenir ki ofisteki karakterler
// aynı anda tek bir işe odaklansın ve ekranda takip edilebilsin.
const { buildSteps, COMMON_RULES, REVIEW_TASK, REPORT_TASK, localizeTask, byId } = require('./agents');
const { parseLanguages, byCode } = require('./languages');
const { runAgent } = require('./llm');
const { demoOutput } = require('./demo-writer');

const agentOf = (stepId) => stepId.split(':')[0];
const langOf = (stepId) => (stepId.startsWith('lokal:') ? byCode(stepId.split(':')[1]) : null);

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

  function buildPrompt({ p, c, prior, brand }) {
    const project = [
      `Ad: ${p.name}`, `Açıklama: ${p.description || '[yok]'}`, `Hedef kitle: ${p.audience || '[yok]'}`,
      `Web: ${p.url || '[yok]'}`, `Ton: ${p.tone || '[yok]'}`,
    ].join('\n');
    const site = p.site_notes
      ? `\n\n<web_sitesi_notlari kaynak="${p.url}">\n${String(p.site_notes).slice(0, 4000)}\n</web_sitesi_notlari>` : '';
    const langs = parseLanguages(c.languages).map((x) => byCode(x).name).join(', ');
    const brief = [
      `Kampanya: ${c.title}`, `Amaç: ${c.goal || '[yok]'}`, `Kanallar: ${c.channels || '[yok]'}`,
      `Bütçe notu (kullanıcı girdisi): ${c.budget_note || '[yok]'}`, `Yayın dilleri: ${langs}`,
      c.revision_note ? `KURUCUDAN REVİZYON NOTU (öncelikli uygula): ${c.revision_note}` : '',
    ].filter(Boolean).join('\n');
    const team = prior.map((d) =>
      `### ${byId(agentOf(d.agent_id)).role}: ${d.title}\n${String(d.body).slice(0, cfg.contextCharsPerDeliverable)}`).join('\n\n');
    const org = brand?.brand_notes
      ? `<marka_kimligi kaynak="${brand.brand_url || ''}">\n${String(brand.brand_notes).slice(0, 3000)}\n</marka_kimligi>\n\n` : '';
    return `${org}<proje_bilgisi>\n${project}\n</proje_bilgisi>${site}\n\n<brif>\n${brief}\n</brif>\n\n` +
      `<ekip_ciktilari>\n${team || 'Henüz yok — ilk adım sensin.'}\n</ekip_ciktilari>`;
  }

  async function produce(stepId, ctx) {
    const agent = byId(agentOf(stepId));
    if (!client) {
      await sleep(cfg.demoDelayMs);
      return demoOutput(stepId, ctx);
    }
    const lang = langOf(stepId);
    const task = stepId === 'mudur:review' ? REVIEW_TASK : lang ? localizeTask(lang) : agent.task;
    const system = `Sen ${agent.name}, ajansın ${agent.role}. ${agent.purpose}\n${COMMON_RULES}\n\n${task}`;
    // Yerelleştirme yalnızca ana (Türkçe) işi görür; diğer dillerin çıktıları bağlamı şişirmesin.
    const prior = lang ? ctx.prior.filter((d) => !d.agent_id.startsWith('lokal:')) : ctx.prior;
    return runAgent(client, cfg, { agentId: agent.id, system, prompt: buildPrompt({ ...ctx, prior }) });
  }

  function saveDeliverable(orgId, c, stepId, out) {
    const lang = langOf(stepId);
    const payload = { ...(out.visual && { visual: out.visual }), ...(lang && { lang: lang.code, dir: lang.dir }),
      ...(out.back_translation && { back_translation: out.back_translation }) };
    const data = Object.keys(payload).length ? JSON.stringify(payload) : null;
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
    const next = ctx.steps[i + 1] ? agentOf(ctx.steps[i + 1]) : null;
    const lang = langOf(stepId);
    const opening = stepId === 'mudur:review' ? 'Son kontrolü yapıyorum 🔍' : lang ? `${lang.native} sürümü geliyor 🌍` : 'Brifi okuyorum…';
    agentState(orgId, agentId, 'thinking', opening, ctx.c.id);
    await sleep(Math.min(800, cfg.demoDelayMs));
    agentState(orgId, agentId, 'working', 'Çalışıyorum…', ctx.c.id);
    const out = await produce(stepId, ctx);
    saveDeliverable(orgId, ctx.c, stepId, out);
    ctx.prior.push({ agent_id: stepId, title: out.title, body: out.body_markdown });
    agentState(orgId, agentId, 'done', out.status_line, ctx.c.id);
    log(orgId, ctx.c.id, agentId, 'deliverable', `${byId(agentId).name}: ${out.title}`);
    if (next && next !== agentId) {
      // Karakter evrakı yürüyerek götürür; alıcı evrak eline geçince işe başlasın.
      publish(orgId, 'handoff', { from: agentId, to: next, title: out.title, campaignId: ctx.c.id });
      await sleep(cfg.handoffMs);
    } else {
      await sleep(Math.min(1200, cfg.demoDelayMs));
    }
  }

  async function execute(orgId, campaignId) {
    const c = db.one('SELECT * FROM campaigns WHERE id = ? AND organization_id = ?', [campaignId, orgId]);
    if (!c) return;
    const p = db.one('SELECT * FROM projects WHERE id = ? AND organization_id = ?', [c.project_id, orgId]);
    db.run('DELETE FROM deliverables WHERE campaign_id = ? AND round = ? AND organization_id = ?', [c.id, c.round, orgId]);
    db.run('UPDATE campaigns SET mode = ? WHERE id = ?', [mode, c.id]);
    setStatus(orgId, c.id, 'calisiyor');
    log(orgId, c.id, 'mudur', 'start', `“${c.title}” (${p.name}) üzerinde çalışma başladı — tur ${c.round}${mode === 'demo' ? ' · demo modu' : ''}`);
    const brand = db.one('SELECT brand_url, brand_notes FROM organizations WHERE id = ?', [orgId]);
    const ctx = { p, c, brand, prior: [], steps: buildSteps(parseLanguages(c.languages)) };
    try {
      for (let i = 0; i < ctx.steps.length; i++) await runStep(orgId, ctx.steps[i], i, ctx);
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

  // Deniz'in performans raporu: GERÇEK ölçüm verisinden. Önceki raporun yerine geçer.
  async function report(orgId, campaignId, { dataText, demoBody }) {
    const c = db.one('SELECT * FROM campaigns WHERE id = ? AND organization_id = ?', [campaignId, orgId]);
    const p = db.one('SELECT * FROM projects WHERE id = ? AND organization_id = ?', [c.project_id, orgId]);
    agentState(orgId, 'analist', 'thinking', 'Rakamlara bakıyorum 📈', c.id);
    await sleep(Math.min(800, cfg.demoDelayMs));
    agentState(orgId, 'analist', 'working', 'Rapor yazıyorum…', c.id);
    let out;
    try {
      if (client) {
        const agent = byId('analist');
        const system = `Sen ${agent.name}, ajansın ${agent.role}.\n${COMMON_RULES}\n\n${REPORT_TASK}`;
        out = await runAgent(client, cfg, { agentId: 'analist', system,
          prompt: `${buildPrompt({ p, c, prior: [], brand: db.one('SELECT brand_url, brand_notes FROM organizations WHERE id = ?', [orgId]) })}\n\n<olcum_verisi>\n${dataText}\n</olcum_verisi>` });
      } else {
        await sleep(cfg.demoDelayMs);
        out = { status_line: 'Haftalık rapor hazır 📊', title: 'Performans raporu', body_markdown: demoBody,
          highlights: [], confidence: 'medium', open_questions: [] };
      }
    } catch (err) {
      agentState(orgId, 'analist', 'idle');
      throw err;
    }
    db.run("DELETE FROM deliverables WHERE campaign_id = ? AND agent_id = 'analist:rapor' AND organization_id = ?", [c.id, orgId]);
    saveDeliverable(orgId, c, 'analist:rapor', out);
    agentState(orgId, 'analist', 'done', out.status_line, c.id);
    log(orgId, c.id, 'analist', 'report', `Deniz: “${c.title}” için performans raporu hazır.`);
    publish(orgId, 'campaign', { id: c.id, status: c.status });
    return out;
  }

  const logError = (orgId, campaignId, agentId, text) => log(orgId, campaignId, agentId, 'error', text);

  return { enqueue, recover, busy, mode, buildPrompt, report, logError };
}

module.exports = { createPipeline };
