// Onay sonrası uçlar: kreatif indirme ve yayın köprüsüne gönderim.
const express = require('express');
const { audit } = require('./db');
const auth = require('./auth');
const { publish } = require('./events');
const { renderCreative, FORMATS } = require('./creative');
const { buildPayload, sendWebhook } = require('./publish');
const { campaignWithDeliverables } = require('./routes');
const { latestImage } = require('./studio');
const { byCode, parseLanguages } = require('./languages');

const HERO_PLACEHOLDER = '{{HERO_IMAGE}}';

// Bir dil için maket: tasarımcının renkleri + (varsa) Lara'nın o dildeki metinleri.
function visualFor(c, lang) {
  const base = c.deliverables.find((d) => d.agent_id === 'tasarimci')?.data?.visual;
  if (!base) return null;
  if (!lang || lang === 'tr') return base;
  const loc = c.deliverables.find((d) => d.agent_id === `lokal:${lang}`)?.data?.visual;
  return loc ? { ...base, ...loc } : null;
}

// imageHref: yayın paketinde görsel her SVG'ye gömülmesin diye yer tutucu verilir (görsel pakete bir kez eklenir).
function creativeFor(db, orgId, c, format, lang, { img = latestImage(db, orgId, c.id), imageHref } = {}) {
  const visual = visualFor(c, lang);
  if (!visual) return null;
  return renderCreative(visual, {
    format, brand: c.project_name, lang: lang || 'tr', dir: byCode(lang || 'tr')?.dir,
    image: img ? imageHref || `data:${img.mime};base64,${img.data}` : '',
  });
}

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
    if (!FORMATS[req.params.format]) return res.status(400).json({ error: 'Format square, story veya wide olmalı.' });
    const lang = byCode(String(req.query.lang || 'tr')) ? String(req.query.lang || 'tr') : 'tr';
    const svg = creativeFor(db, req.orgId, c, req.params.format, lang);
    if (!svg) return res.status(404).json({ error: 'Bu dil için henüz tasarım/yerelleştirme yok.' });
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    if (req.query.download) res.set('Content-Disposition', `attachment; filename="kampanya-${c.id}-${lang}-${req.params.format}.svg"`);
    res.send(svg);
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
      const img = latestImage(db, req.orgId, c.id);
      const creatives = {};
      for (const lang of parseLanguages(c.languages)) {
        const set = Object.fromEntries(Object.keys(FORMATS)
          .map((f) => [f, creativeFor(db, req.orgId, c, f, lang, { img, imageHref: HERO_PLACEHOLDER })]).filter(([, v]) => v));
        if (Object.keys(set).length) creatives[lang] = set;
      }
      const hero = img ? { mime: img.mime, base64: img.data, placeholder: HERO_PLACEHOLDER } : null;
      await sendWebhook(cfg, buildPayload(c, project, creatives, hero), fetchImpl);
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
