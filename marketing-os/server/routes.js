// REST uçları. Her sorgu organization_id'yi req.orgId'den (oturumdan) alır.
const express = require('express');
const { audit } = require('./db');
const auth = require('./auth');
const { subscribe } = require('./events');
const { publicRoster, byId } = require('./agents');

const clean = (v, max = 2000) => String(v ?? '').trim().slice(0, max);
const COLOR = /^#[0-9a-fA-F]{6}$/;

function projectFields(b) {
  return {
    name: clean(b.name, 80), description: clean(b.description, 2000), audience: clean(b.audience, 500),
    url: clean(b.url, 300), tone: clean(b.tone, 200), color: COLOR.test(b.color) ? b.color : '#6366f1',
  };
}

function loginLimiter() {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const list = (hits.get(req.ip) || []).filter((t) => now - t < 15 * 60 * 1000);
    if (list.length >= 10) return res.status(429).json({ error: 'Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.' });
    list.push(now); hits.set(req.ip, list); next();
  };
}

function campaignWithDeliverables(db, orgId, id) {
  const c = db.one(`SELECT c.*, p.name AS project_name, p.color AS project_color FROM campaigns c
                    JOIN projects p ON p.id = c.project_id WHERE c.id = ? AND c.organization_id = ?`, [id, orgId]);
  if (!c) return null;
  const deliverables = db.many('SELECT * FROM deliverables WHERE campaign_id = ? AND round = ? AND organization_id = ? ORDER BY id',
    [id, c.round, orgId]).map((d) => ({ ...d, data: d.data ? JSON.parse(d.data) : null }));
  return { ...c, deliverables };
}

function exportMarkdown(c) {
  const parts = [`# ${c.title}\n`, `Proje: ${c.project_name} · Tur: ${c.round} · Durum: ${c.status} · Mod: ${c.mode}\n`];
  for (const d of c.deliverables) {
    const a = byId(d.agent_id.split(':')[0]);
    parts.push(`\n---\n\n## ${a.emoji} ${a.role} (${a.name}) — ${d.title}\n\nGüven: ${d.confidence}\n\n${d.body}\n`);
    if (d.data?.visual) parts.push(`\n**Maket:** ${JSON.stringify(d.data.visual, null, 2)}\n`);
  }
  return parts.join('');
}

function buildRouter({ db, cfg, pipeline }) {
  const r = express.Router();
  const need = auth.middleware(db);
  const who = (req) => ({ orgId: req.orgId, username: req.user?.username, ip: req.ip });

  r.get('/health', (req, res) => res.json({ status: 'ok', mode: pipeline.mode, time: Date.now() }));

  r.post('/login', loginLimiter(), (req, res) => {
    const out = auth.login(db, cfg, { username: req.body?.username, pass: req.body?.pass, ip: req.ip });
    if (!out) return res.status(401).json({ error: 'Kullanıcı adı veya parola hatalı.' });
    res.setHeader('Set-Cookie', auth.cookieHeader(cfg, out.token, cfg.sessionTtlMs));
    res.json({ user: out.user });
  });

  r.post('/logout', need, (req, res) => {
    db.run('DELETE FROM sessions WHERE token = ?', [req.token]);
    audit(db, { ...who(req), action: 'logout' });
    res.setHeader('Set-Cookie', auth.cookieHeader(cfg, '', 0));
    res.json({ ok: true });
  });

  r.get('/me', need, (req, res) => res.json({
    user: req.user, mode: pipeline.mode, model: pipeline.mode === 'ai' ? cfg.model : null, roster: publicRoster(),
    publishEnabled: Boolean(cfg.publishWebhookUrl),
  }));

  r.get('/events', need, (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    res.write(`event: hello\ndata: {"busy":${pipeline.busy(req.orgId)}}\n\n`);
    const off = subscribe(req.orgId, res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); off(); });
  });

  // --- Projeler (portföy) ---
  r.get('/projects', need, (req, res) =>
    res.json(db.many('SELECT * FROM projects WHERE organization_id = ? ORDER BY name', [req.orgId])));

  r.post('/projects', need, (req, res) => {
    const f = projectFields(req.body || {});
    if (!f.name) return res.status(400).json({ error: 'Proje adı zorunludur.' });
    db.run(`INSERT INTO projects (organization_id, name, description, audience, url, tone, color, created_at)
            VALUES (?,?,?,?,?,?,?,?)`, [req.orgId, f.name, f.description, f.audience, f.url, f.tone, f.color, Date.now()]);
    audit(db, { ...who(req), action: 'project.create', target: f.name });
    res.status(201).json({ ok: true });
  });

  r.put('/projects/:id', need, (req, res) => {
    const f = projectFields(req.body || {});
    if (!f.name) return res.status(400).json({ error: 'Proje adı zorunludur.' });
    const info = db.run(`UPDATE projects SET name=?, description=?, audience=?, url=?, tone=?, color=?
                         WHERE id = ? AND organization_id = ?`,
      [f.name, f.description, f.audience, f.url, f.tone, f.color, Number(req.params.id), req.orgId]);
    if (!info.changes) return res.status(404).json({ error: 'Proje bulunamadı.' });
    audit(db, { ...who(req), action: 'project.update', target: req.params.id });
    res.json({ ok: true });
  });

  // --- Kampanyalar ---
  r.get('/campaigns', need, (req, res) => res.json(db.many(
    `SELECT c.id, c.title, c.status, c.round, c.mode, c.updated_at, p.name AS project_name, p.color AS project_color
     FROM campaigns c JOIN projects p ON p.id = c.project_id WHERE c.organization_id = ? ORDER BY c.updated_at DESC LIMIT 100`,
    [req.orgId])));

  r.post('/campaigns', need, (req, res) => {
    const b = req.body || {};
    const project = db.one('SELECT id FROM projects WHERE id = ? AND organization_id = ?', [Number(b.project_id), req.orgId]);
    if (!project) return res.status(400).json({ error: 'Geçerli bir proje seçin.' });
    const title = clean(b.title, 120);
    if (!title) return res.status(400).json({ error: 'Kampanya adı zorunludur.' });
    const now = Date.now();
    const info = db.run(`INSERT INTO campaigns (organization_id, project_id, title, goal, channels, budget_note, status, round, created_at, updated_at)
                         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.orgId, project.id, title, clean(b.goal), clean(b.channels, 300), clean(b.budget_note, 300), 'sirada', 1, now, now]);
    const id = Number(info.lastInsertRowid);
    audit(db, { ...who(req), action: 'campaign.create', target: id });
    pipeline.enqueue(req.orgId, id);
    res.status(201).json({ id });
  });

  r.get('/campaigns/:id', need, (req, res) => {
    const c = campaignWithDeliverables(db, req.orgId, Number(req.params.id));
    return c ? res.json(c) : res.status(404).json({ error: 'Kampanya bulunamadı.' });
  });

  // İnsan onayı: approve | revise | reject. Yalnızca "onay_bekliyor" durumunda.
  r.post('/campaigns/:id/decision', need, (req, res) => {
    const id = Number(req.params.id);
    const c = db.one('SELECT * FROM campaigns WHERE id = ? AND organization_id = ?', [id, req.orgId]);
    if (!c) return res.status(404).json({ error: 'Kampanya bulunamadı.' });
    if (c.status !== 'onay_bekliyor') return res.status(409).json({ error: 'Bu kampanya şu an onay beklemiyor.' });
    const decision = req.body?.decision;
    const note = clean(req.body?.note, 1000);
    if (decision === 'revise' && !note) return res.status(400).json({ error: 'Revizyon için ekibe bir not yazın.' });
    const map = { approve: 'onaylandi', reject: 'reddedildi' };
    if (decision === 'revise') {
      db.run('UPDATE campaigns SET round = round + 1, revision_note = ?, updated_at = ? WHERE id = ?', [note, Date.now(), id]);
      pipeline.enqueue(req.orgId, id);
    } else if (map[decision]) {
      db.run('UPDATE campaigns SET status = ?, decision_note = ?, updated_at = ? WHERE id = ?', [map[decision], note, Date.now(), id]);
    } else {
      return res.status(400).json({ error: 'Geçersiz karar.' });
    }
    audit(db, { ...who(req), action: `campaign.${decision}`, target: id });
    db.run('INSERT INTO activity (organization_id, campaign_id, agent_id, kind, text, at) VALUES (?,?,?,?,?,?)',
      [req.orgId, id, 'mudur', 'decision', `Kurucu kararı: ${{ approve: 'ONAYLANDI ✅', revise: 'REVİZYON 🔁', reject: 'REDDEDİLDİ ❌' }[decision]}${note ? ` — “${note}”` : ''}`, Date.now()]);
    res.json({ ok: true });
  });

  r.post('/campaigns/:id/retry', need, (req, res) => {
    const id = Number(req.params.id);
    const c = db.one('SELECT status FROM campaigns WHERE id = ? AND organization_id = ?', [id, req.orgId]);
    if (!c) return res.status(404).json({ error: 'Kampanya bulunamadı.' });
    if (c.status !== 'hata') return res.status(409).json({ error: 'Yalnızca hata veren kampanyalar yeniden denenebilir.' });
    audit(db, { ...who(req), action: 'campaign.retry', target: id });
    pipeline.enqueue(req.orgId, id);
    res.json({ ok: true });
  });

  r.get('/campaigns/:id/export', need, (req, res) => {
    const c = campaignWithDeliverables(db, req.orgId, Number(req.params.id));
    if (!c) return res.status(404).json({ error: 'Kampanya bulunamadı.' });
    audit(db, { ...who(req), action: 'campaign.export', target: c.id });
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="kampanya-${c.id}-tur${c.round}.md"`);
    res.send(exportMarkdown(c));
  });

  r.get('/activity', need, (req, res) => res.json(db.many(
    'SELECT campaign_id AS campaignId, agent_id AS agentId, kind, text, at FROM activity WHERE organization_id = ? ORDER BY id DESC LIMIT 60',
    [req.orgId])));

  return r;
}

module.exports = { buildRouter, exportMarkdown, campaignWithDeliverables };
