// Performans ölçümü: elle/CSV giriş, Zapier/Make ile otomatik alım (Bearer token), KPI hesabı,
// Deniz'in (analist) gerçek veriden rapor yazması.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { audit } = require('./db');
const auth = require('./auth');

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : NaN);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Satırları doğrular; hatalı satırı atlamaz, tüm isteği reddeder (yarım veri yazılmasın).
function validateRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return { error: 'En az bir satır veri gönderin.' };
  if (rows.length > 1000) return { error: 'Tek seferde en fazla 1000 satır gönderilebilir.' };
  const out = [];
  for (const [i, r] of rows.entries()) {
    const row = {
      day: String(r.day || '').trim(), channel: String(r.channel || '').trim().slice(0, 40),
      lang: String(r.lang || '').trim().toLowerCase().slice(0, 8),
      impressions: num(r.impressions ?? 0), clicks: num(r.clicks ?? 0), conversions: num(r.conversions ?? 0), spend: num(r.spend ?? 0),
    };
    if (!DAY.test(row.day)) return { error: `${i + 1}. satır: tarih YYYY-AA-GG biçiminde olmalı.` };
    if (!row.channel) return { error: `${i + 1}. satır: kanal adı eksik.` };
    if ([row.impressions, row.clicks, row.conversions, row.spend].some(Number.isNaN)) return { error: `${i + 1}. satır: sayılar 0 veya pozitif olmalı.` };
    out.push(row);
  }
  return { rows: out };
}

function upsert(db, orgId, campaignId, rows, source) {
  const now = Date.now();
  for (const r of rows) {
    db.run(`INSERT INTO metrics (organization_id, campaign_id, day, channel, lang, impressions, clicks, conversions, spend, source, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(campaign_id, day, channel, lang) DO UPDATE SET impressions=excluded.impressions, clicks=excluded.clicks,
            conversions=excluded.conversions, spend=excluded.spend, source=excluded.source, updated_at=excluded.updated_at`,
    [orgId, campaignId, r.day, r.channel, r.lang, Math.round(r.impressions), Math.round(r.clicks), Math.round(r.conversions), r.spend, source, now]);
  }
}

const ratio = (a, b) => (b > 0 ? a / b : null);
function kpis(t) {
  return { ctr: ratio(t.clicks, t.impressions), cvr: ratio(t.conversions, t.clicks), cpc: ratio(t.spend, t.clicks), cpa: ratio(t.spend, t.conversions) };
}

function summarize(rows) {
  const FIELDS = ['impressions', 'clicks', 'conversions', 'spend'];
  const zero = () => ({ impressions: 0, clicks: 0, conversions: 0, spend: 0 });
  const add = (acc, r) => { for (const k of FIELDS) acc[k] += r[k]; return acc; };
  const group = (key) => Object.values(rows.reduce((m, r) => {
    const k = key(r); m[k] = m[k] || { key: k, ...zero() }; add(m[k], r); return m;
  }, {})).map((g) => ({ ...g, ...kpis(g) }));
  const totals = rows.reduce(add, zero());
  return {
    totals: { ...totals, ...kpis(totals) },
    byDay: group((r) => r.day).sort((a, b) => a.key.localeCompare(b.key)),
    byChannel: group((r) => r.channel).sort((a, b) => b.clicks - a.clicks),
    byLang: group((r) => r.lang || '—').sort((a, b) => b.clicks - a.clicks),
  };
}

const PCT = new Intl.NumberFormat('tr-TR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => (v == null ? '—' : PCT.format(v));
function money(v, cur) {
  if (v == null) return '—';
  try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: cur }).format(v); } catch { return `${v.toFixed(2)} ${cur}`; }
}

function dataText(s, cur) {
  const line = (g) => `${g.key}: gösterim ${g.impressions}, tıklama ${g.clicks}, dönüşüm ${g.conversions}, harcama ${money(g.spend, cur)}, CTR ${pct(g.ctr)}, CPC ${money(g.cpc, cur)}, CPA ${money(g.cpa, cur)}`;
  return [`Para birimi: ${cur}`, `TOPLAM → ${line({ key: 'toplam', ...s.totals })}`,
    'KANAL:', ...s.byChannel.map(line), 'DİL:', ...s.byLang.map(line), 'GÜN:', ...s.byDay.map(line)].join('\n');
}

function demoReport(s, cur) {
  const best = s.byChannel[0];
  const cheapest = [...s.byChannel].filter((g) => g.cpa != null).sort((a, b) => a.cpa - b.cpa)[0];
  return `> ⚠️ **Demo modu:** Bu rapor kurallı bir özetle üretildi; AI yorumu için \`ANTHROPIC_API_KEY\` tanımlayın.\n\n## Özet
- Toplam ${s.totals.impressions} gösterim, ${s.totals.clicks} tıklama, ${s.totals.conversions} dönüşüm; harcama ${money(s.totals.spend, cur)}.
- CTR ${pct(s.totals.ctr)}, CPC ${money(s.totals.cpc, cur)}, CPA ${money(s.totals.cpa, cur)}.
- En çok tıklama: **${best?.key || '—'}**${cheapest ? `; en düşük CPA: **${cheapest.key}** (${money(cheapest.cpa, cur)})` : ''}.

## Kanal karşılaştırması
| Kanal | Gösterim | Tıklama | Dönüşüm | CTR | CPA |
|---|---|---|---|---|---|
${s.byChannel.map((g) => `| ${g.key} | ${g.impressions} | ${g.clicks} | ${g.conversions} | ${pct(g.ctr)} | ${money(g.cpa, cur)} |`).join('\n')}

## Önerilen aksiyon (öneri — karar sizde)
- Bütçeyi düşük CPA'lı kanala kaydırmayı değerlendirin; kararı en az 7 günlük veriyle verin.`;
}

function buildMetricsRouter({ db, cfg, pipeline }) {
  const r = express.Router();
  const need = auth.middleware(db);
  const owned = (req) => db.one('SELECT * FROM campaigns WHERE id = ? AND organization_id = ?', [Number(req.params.id), req.orgId]);
  const load = (orgId, id) => db.many(
    'SELECT day, channel, lang, impressions, clicks, conversions, spend FROM metrics WHERE campaign_id = ? AND organization_id = ? ORDER BY day',
    [id, orgId]);

  r.get('/campaigns/:id/metrics', need, (req, res) => {
    const c = owned(req);
    if (!c) return res.status(404).json({ error: 'Kampanya bulunamadı.' });
    const rows = load(req.orgId, c.id);
    res.json({ currency: cfg.currency, rows, ...summarize(rows) });
  });

  r.post('/campaigns/:id/metrics', need, (req, res) => {
    const c = owned(req);
    if (!c) return res.status(404).json({ error: 'Kampanya bulunamadı.' });
    const v = validateRows(req.body?.rows);
    if (v.error) return res.status(400).json({ error: v.error });
    upsert(db, req.orgId, c.id, v.rows, 'manual');
    audit(db, { orgId: req.orgId, username: req.user.username, action: 'metrics.import', target: `${c.id}:${v.rows.length}`, ip: req.ip });
    res.json({ ok: true, count: v.rows.length });
  });

  r.post('/campaigns/:id/report', need, (req, res) => {
    const c = owned(req);
    if (!c) return res.status(404).json({ error: 'Kampanya bulunamadı.' });
    const rows = load(req.orgId, c.id);
    if (!rows.length) return res.status(400).json({ error: 'Önce ölçüm verisi girin; Deniz rakam uydurmaz.' });
    const s = summarize(rows);
    audit(db, { orgId: req.orgId, username: req.user.username, action: 'metrics.report', target: c.id, ip: req.ip });
    pipeline.report(req.orgId, c.id, { dataText: dataText(s, cfg.currency), demoBody: demoReport(s, cfg.currency) })
      .catch((err) => pipeline.logError(req.orgId, c.id, 'analist', `Rapor yazılamadı: ${err.message}`));
    res.status(202).json({ ok: true });
  });

  // Entegrasyon anahtarı: yalnızca özeti (hash) saklanır, açık hali bir kez gösterilir.
  r.get('/settings/integrations', need, (req, res) => {
    const org = db.one('SELECT ingest_token FROM organizations WHERE id = ?', [req.orgId]);
    res.json({ hasIngestToken: Boolean(org?.ingest_token), ingestPath: '/api/ingest/metrics' });
  });
  r.post('/settings/integrations/rotate', need, (req, res) => {
    const token = `mos_${crypto.randomBytes(24).toString('base64url')}`;
    db.run('UPDATE organizations SET ingest_token = ? WHERE id = ?', [sha(token), req.orgId]);
    audit(db, { orgId: req.orgId, username: req.user.username, action: 'integration.rotate', ip: req.ip });
    res.json({ token });
  });

  // Yedek: tutarlı anlık kopya (VACUUM INTO) indirilir. Yalnızca sahip (owner) rolü.
  r.get('/settings/backup', need, (req, res) => {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Yedeği yalnızca hesap sahibi indirebilir.' });
    if (cfg.dbFile === ':memory:') return res.status(400).json({ error: 'Bellek içi veritabanı yedeklenemez.' });
    const tmp = path.join(os.tmpdir(), `mos-backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.db`);
    try {
      db.raw.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    } catch {
      return res.status(500).json({ error: 'Yedek oluşturulamadı. Disk alanını kontrol edip tekrar deneyin.' });
    }
    audit(db, { orgId: req.orgId, username: req.user.username, action: 'backup.download', ip: req.ip });
    const name = `marketing-os-yedek-${new Date().toISOString().slice(0, 10)}.db`;
    res.download(tmp, name, () => fs.rm(tmp, { force: true }, () => {}));
  });

  // Otomatik alım (Zapier/Make/n8n): Authorization: Bearer <token>; org token'dan bulunur.
  r.post('/ingest/metrics', (req, res) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const org = token && db.one('SELECT id FROM organizations WHERE ingest_token = ?', [sha(token)]);
    if (!org) return res.status(401).json({ error: 'Geçersiz entegrasyon anahtarı.' });
    const c = db.one('SELECT id FROM campaigns WHERE id = ? AND organization_id = ?', [Number(req.body?.campaign_id), org.id]);
    if (!c) return res.status(404).json({ error: 'Kampanya bulunamadı.' });
    const v = validateRows(req.body?.rows);
    if (v.error) return res.status(400).json({ error: v.error });
    upsert(db, org.id, c.id, v.rows, 'ingest');
    audit(db, { orgId: org.id, username: 'entegrasyon', action: 'metrics.ingest', target: `${c.id}:${v.rows.length}`, ip: req.ip });
    res.json({ ok: true, count: v.rows.length });
  });

  return r;
}

module.exports = { buildMetricsRouter, validateRows, summarize, dataText };
