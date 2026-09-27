// Onay sonrası uçlar: kreatif indirme ve yayın köprüsüne gönderim.
const express = require('express');
const { audit } = require('./db');
const auth = require('./auth');
const { publish } = require('./events');
const { renderCreative, FORMATS } = require('./creative');
const { buildPayload, sendWebhook } = require('./publish');
const { campaignWithDeliverables } = require('./routes');

function buildReleaseRouter({ db, cfg, fetchImpl }) {
  const r = express.Router();
  const need = auth.middleware(db);
  const inFlight = new Set(); // çift tıklamada iki kez gönderimi önler

  function load(req, res) {
    const c = campaignWithDeliverables(db, req.orgId, Number(req.params.id));
    if (!c) res.status(404).json({ error: 'Kampanya bulunamadı.' });
    return c;
  }

  r.get('/campaigns/:id/creative/:format.svg', need, (req, res) => {
    const c = load(req, res);
    if (!c) return;
    const visual = c.deliverables.find((d) => d.agent_id === 'tasarimci')?.data?.visual;
    if (!visual) return res.status(404).json({ error: 'Bu kampanyada henüz tasarım maketi yok.' });
    if (!FORMATS[req.params.format]) return res.status(400).json({ error: 'Format square, story veya wide olmalı.' });
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    if (req.query.download) res.set('Content-Disposition', `attachment; filename="kampanya-${c.id}-${req.params.format}.svg"`);
    res.send(renderCreative(visual, { format: req.params.format, brand: c.project_name }));
  });

  // Kritik eylem: yalnızca onaylı kampanya + açık teyit. Denetime yazılır.
  r.post('/campaigns/:id/publish', need, async (req, res) => {
    const c = load(req, res);
    if (!c) return;
    if (c.status !== 'onaylandi') return res.status(409).json({ error: 'Yalnızca onayladığınız kampanyalar yayın aracına gönderilebilir.' });
    if (req.body?.confirm !== true) return res.status(400).json({ error: 'Gönderimi teyit etmeniz gerekiyor.' });
    const project = db.one('SELECT * FROM projects WHERE id = ? AND organization_id = ?', [c.project_id, req.orgId]);
    const who = { orgId: req.orgId, username: req.user.username, ip: req.ip, target: c.id };
    if (inFlight.has(c.id)) return res.status(409).json({ error: 'Bu kampanya şu an gönderiliyor, lütfen bekleyin.' });
    inFlight.add(c.id);
    try {
      await sendWebhook(cfg, buildPayload(c, project), fetchImpl);
    } catch (err) {
      audit(db, { ...who, action: 'campaign.publish', result: 'fail' });
      return res.status(err.status || 502).json({ error: err.message });
    } finally {
      inFlight.delete(c.id);
    }
    const now = Date.now();
    db.run("UPDATE campaigns SET status = 'yayina_gonderildi', updated_at = ? WHERE id = ? AND organization_id = ?", [now, c.id, req.orgId]);
    audit(db, { ...who, action: 'campaign.publish' });
    const text = `“${c.title}” taslak olarak yayın aracına gönderildi 🚀`;
    db.run('INSERT INTO activity (organization_id, campaign_id, agent_id, kind, text, at) VALUES (?,?,?,?,?,?)',
      [req.orgId, c.id, 'sosyal', 'publish', text, now]);
    publish(req.orgId, 'activity', { campaignId: c.id, agentId: 'sosyal', kind: 'publish', text, at: now });
    publish(req.orgId, 'agent', { agentId: 'sosyal', state: 'done', line: 'Taslaklar yayın aracında! 🚀', campaignId: c.id });
    publish(req.orgId, 'campaign', { id: c.id, status: 'yayina_gonderildi' });
    res.json({ ok: true });
  });

  return r;
}

module.exports = { buildReleaseRouter };
