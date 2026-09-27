// Sunucusuz tarayıcı demosu: /api/* isteklerini ve canlı olay akışını tarayıcı içinde taklit eder.
// Ajan tanımları, demo metinleri, kreatif çizimi ve ölçüm hesapları gerçek sunucu modülleridir;
// yalnızca veritabanı yerine bellek, ağ yerine zamanlayıcılar kullanılır. Hiçbir şey kaydedilmez/gönderilmez.
import { publicRoster, buildSteps, byId } from '../server/agents.js';
import { LANGUAGES, byCode, parseLanguages } from '../server/languages.js';
import { demoOutput } from '../server/demo-writer.js';
import { renderCreative } from '../server/creative.js';
import { PORTFOLIO, BRAND_NOTES, SITE } from '../server/seed.js';
import { validateRows, summarize, demoReport } from '../server/metrics-core.js';

const T = { think: 800, work: 1500, handoff: 3800 };
const now = () => Date.now();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const db = {
  projects: PORTFOLIO.map((p, i) => ({ id: i + 1, ...p, url: SITE, tone: '', site_notes: null, site_fetched_at: null })),
  campaigns: [], deliverables: [], activity: [], metrics: [], nextId: 1, nextDeliv: 1,
};

// ---------- Canlı olaylar (EventSource yerine) ----------
const listeners = new Set();
function publish(type, payload) { for (const l of listeners) l(type, payload); }
class DemoEventSource {
  constructor() {
    this.readyState = 1;
    this.handlers = {};
    this.fn = (type, payload) => (this.handlers[type] || []).forEach((h) => h({ data: JSON.stringify(payload) }));
    listeners.add(this.fn);
    setTimeout(() => this.onopen?.(), 0);
  }
  addEventListener(type, h) { (this.handlers[type] ||= []).push(h); }
  close() { this.readyState = 2; listeners.delete(this.fn); }
}
DemoEventSource.OPEN = 1;
window.EventSource = DemoEventSource;

// ---------- Kampanya iş hattı ----------
const project = (id) => db.projects.find((p) => p.id === id);
const campaign = (id) => db.campaigns.find((c) => c.id === id);
function log(campaignId, agentId, kind, text) {
  const a = { campaignId, agentId, kind, text, at: now() };
  db.activity.unshift(a);
  publish('activity', a);
}
function setStatus(c, status) { c.status = status; c.updated_at = now(); publish('campaign', { id: c.id, status }); }

function save(c, stepId, out) {
  const lang = stepId.startsWith('lokal:') ? byCode(stepId.split(':')[1]) : null;
  const data = { ...(out.visual && { visual: out.visual }), ...(lang && { lang: lang.code, dir: lang.dir }),
    ...(out.back_translation && { back_translation: out.back_translation }) };
  const extra = [out.highlights?.length ? `\n\n**Öne çıkanlar:** ${out.highlights.join(' · ')}` : '',
    out.open_questions?.length ? `\n\n**Açık sorular:**\n${out.open_questions.map((q) => `- ${q}`).join('\n')}` : ''].join('');
  db.deliverables.push({ id: db.nextDeliv++, campaign_id: c.id, round: c.round, agent_id: stepId, title: out.title,
    body: out.body_markdown + extra, data: Object.keys(data).length ? data : null, confidence: out.confidence, created_at: now() });
}

// instant: sayfa açılışındaki örnek kampanyalar için animasyonsuz üretim
async function run(c, { instant = false } = {}) {
  const p = project(c.project_id);
  const steps = buildSteps(parseLanguages(c.languages));
  db.deliverables = db.deliverables.filter((d) => !(d.campaign_id === c.id && d.round === c.round));
  c.mode = 'demo';
  if (!instant) { setStatus(c, 'calisiyor'); log(c.id, 'mudur', 'start', `“${c.title}” (${p.name}) üzerinde çalışma başladı — tur ${c.round} · demo`); }
  for (const [i, stepId] of steps.entries()) {
    const agentId = stepId.split(':')[0];
    const out = demoOutput(stepId, { p, c, prior: [] });
    if (instant) { save(c, stepId, out); continue; }
    const lang = stepId.startsWith('lokal:') ? byCode(stepId.split(':')[1]) : null;
    publish('agent', { agentId, state: 'thinking', line: stepId === 'mudur:review' ? 'Son kontrolü yapıyorum 🔍' : lang ? `${lang.native} sürümü geliyor 🌍` : 'Brifi okuyorum…' });
    await wait(T.think);
    publish('agent', { agentId, state: 'working', line: 'Çalışıyorum…' });
    await wait(T.work);
    save(c, stepId, out);
    publish('agent', { agentId, state: 'done', line: out.status_line });
    log(c.id, agentId, 'deliverable', `${byId(agentId).name}: ${out.title}`);
    const next = steps[i + 1]?.split(':')[0];
    if (next && next !== agentId) { publish('handoff', { from: agentId, to: next, title: out.title }); await wait(T.handoff); } else await wait(1200);
  }
  if (instant) return;
  setStatus(c, 'onay_bekliyor');
  publish('agent', { agentId: 'mudur', state: 'waiting', line: 'Onayınızı bekliyoruz 🙌' });
  log(c.id, 'mudur', 'approval', `“${c.title}” onayınıza sunuldu.`);
}

let chain = Promise.resolve();
const enqueue = (c) => { setStatus(c, 'sirada'); chain = chain.then(() => run(c)); };

function createCampaign(b) {
  const c = { id: db.nextId++, project_id: Number(b.project_id), title: String(b.title || '').trim(), goal: b.goal || '',
    channels: b.channels || '', budget_note: b.budget_note || '', languages: parseLanguages(b.languages).join(','),
    status: 'sirada', round: 1, mode: 'demo', revision_note: null, created_at: now(), updated_at: now() };
  db.campaigns.push(c);
  return c;
}

function withDeliverables(c) {
  const p = project(c.project_id);
  return { ...c, project_name: p.name, project_color: p.color,
    deliverables: db.deliverables.filter((d) => d.campaign_id === c.id && d.round === c.round) };
}

// ---------- Kreatifler (img src için doğrudan data URI) ----------
window.MOS_CREATIVE_SRC = (id, format, lang) => {
  const c = withDeliverables(campaign(id));
  const base = c.deliverables.find((d) => d.agent_id === 'tasarimci')?.data?.visual;
  const loc = lang === 'tr' ? {} : c.deliverables.find((d) => d.agent_id === `lokal:${lang}`)?.data?.visual;
  if (!base || !loc) return 'data:image/svg+xml,';
  const svg = renderCreative({ ...base, ...loc }, { format, brand: c.project_name, lang, dir: byCode(lang)?.dir });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

// ---------- API ----------
const ok = (data, status = 200) => ({ status, data });
const err = (error, status = 400) => ({ status, data: { error } });
const DEMO_ONLY = 'Demo sürümünde bu işlem kapalı; gerçek kurulumda çalışır.';

const routes = [
  ['GET', /^\/me$/, () => ok({ user: { username: 'demo', name: 'Kurucu', role: 'owner' }, mode: 'demo', model: null,
    roster: publicRoster(), publishEnabled: true, imageEnabled: false, languages: LANGUAGES, currency: 'TRY' })],
  ['POST', /^\/logout$/, () => ok({ ok: true })],
  ['GET', /^\/projects$/, () => ok([...db.projects].sort((a, b) => a.name.localeCompare(b.name, 'tr')))],
  ['POST', /^\/projects$/, (b) => { if (!b.name) return err('Proje adı zorunludur.');
    db.projects.push({ id: db.projects.length + 1, ...b }); return ok({ ok: true }, 201); }],
  ['PUT', /^\/projects\/(\d+)$/, (b, [id]) => { Object.assign(project(Number(id)), b); return ok({ ok: true }); }],
  ['POST', /^\/projects\/(\d+)\/import-site$/, () => err(`${DEMO_ONLY} (Demo, dış sitelere bağlanamaz.)`)],
  ['GET', /^\/campaigns$/, () => ok(db.campaigns.map((c) => ({ ...c, project_name: project(c.project_id).name,
    project_color: project(c.project_id).color })).sort((a, b) => b.updated_at - a.updated_at))],
  ['POST', /^\/campaigns$/, (b) => { if (!project(Number(b.project_id))) return err('Geçerli bir proje seçin.');
    if (!String(b.title || '').trim()) return err('Kampanya adı zorunludur.');
    const c = createCampaign(b); enqueue(c); return ok({ id: c.id }, 201); }],
  ['GET', /^\/campaigns\/(\d+)$/, (b, [id]) => (campaign(Number(id)) ? ok(withDeliverables(campaign(Number(id)))) : err('Kampanya bulunamadı.', 404))],
  ['POST', /^\/campaigns\/(\d+)\/decision$/, (b, [id]) => decide(campaign(Number(id)), b)],
  ['POST', /^\/campaigns\/(\d+)\/retry$/, (b, [id]) => { enqueue(campaign(Number(id))); return ok({ ok: true }); }],
  ['POST', /^\/campaigns\/(\d+)\/publish$/, (b, [id]) => publishCampaign(campaign(Number(id)))],
  ['POST', /^\/campaigns\/(\d+)\/image$/, () => err(DEMO_ONLY)],
  ['GET', /^\/campaigns\/(\d+)\/metrics$/, (b, [id]) => { const rows = db.metrics.filter((m) => m.campaign_id === Number(id));
    return ok({ currency: 'TRY', rows, ...summarize(rows) }); }],
  ['POST', /^\/campaigns\/(\d+)\/metrics$/, (b, [id]) => addMetrics(Number(id), b.rows)],
  ['POST', /^\/campaigns\/(\d+)\/report$/, (b, [id]) => report(campaign(Number(id)))],
  ['GET', /^\/activity$/, () => ok(db.activity.slice(0, 60))],
  ['GET', /^\/settings\/integrations$/, () => ok({ hasIngestToken: false, ingestPath: '/api/ingest/metrics' })],
  ['POST', /^\/settings\/integrations\/rotate$/, () => ok({ token: 'mos_demo_bu-anahtar-gercek-degil' })],
  ['GET', /^\/settings\/brand$/, () => ok({ url: SITE, notes: BRAND_NOTES, fetchedAt: Date.parse('2026-09-27T12:00:00Z') })],
  ['POST', /^\/settings\/brand\/import$/, () => err(`${DEMO_ONLY} (Demo, dış sitelere bağlanamaz.)`)],
];

function decide(c, { decision, note = '' }) {
  if (c.status !== 'onay_bekliyor') return err('Bu kampanya şu an onay beklemiyor.', 409);
  if (decision === 'revise' && !note.trim()) return err('Revizyon için ekibe bir not yazın.');
  if (decision === 'revise') { c.round += 1; c.revision_note = note; enqueue(c); }
  else if (decision === 'approve' || decision === 'reject') setStatus(c, decision === 'approve' ? 'onaylandi' : 'reddedildi');
  else return err('Geçersiz karar.');
  log(c.id, 'mudur', 'decision', `Kurucu kararı: ${{ approve: 'ONAYLANDI ✅', revise: 'REVİZYON 🔁', reject: 'REDDEDİLDİ ❌' }[decision]}${note ? ` — “${note}”` : ''}`);
  return ok({ ok: true });
}

function publishCampaign(c) {
  if (c.status !== 'onaylandi') return err('Yalnızca onayladığınız kampanyalar yayın aracına gönderilebilir.', 409);
  setStatus(c, 'yayina_gonderildi');
  log(c.id, 'sosyal', 'publish', `“${c.title}” yayın aracına gönderildi 🚀 (demo: gerçek gönderim yapılmadı)`);
  publish('agent', { agentId: 'sosyal', state: 'done', line: 'Taslaklar yayın aracında! 🚀' });
  return ok({ ok: true });
}

function addMetrics(id, rows) {
  const v = validateRows(rows);
  if (v.error) return err(v.error);
  for (const r of v.rows) {
    db.metrics = db.metrics.filter((m) => !(m.campaign_id === id && m.day === r.day && m.channel === r.channel && m.lang === r.lang));
    db.metrics.push({ campaign_id: id, ...r });
  }
  return ok({ ok: true, count: v.rows.length });
}

function report(c, { instant = false } = {}) {
  const rows = db.metrics.filter((m) => m.campaign_id === c.id);
  if (!rows.length) return err('Önce ölçüm verisi girin; Deniz rakam uydurmaz.');
  const out = { title: 'Performans raporu', body_markdown: demoReport(summarize(rows), 'TRY'), confidence: 'medium', status_line: 'Haftalık rapor hazır 📊' };
  const finish = () => {
    db.deliverables = db.deliverables.filter((d) => !(d.campaign_id === c.id && d.agent_id === 'analist:rapor'));
    save(c, 'analist:rapor', out);
  };
  if (instant) { finish(); return ok({ ok: true }); }
  publish('agent', { agentId: 'analist', state: 'thinking', line: 'Rakamlara bakıyorum 📈' });
  setTimeout(() => publish('agent', { agentId: 'analist', state: 'working', line: 'Rapor yazıyorum…' }), T.think);
  setTimeout(() => { finish(); publish('agent', { agentId: 'analist', state: 'done', line: out.status_line });
    log(c.id, 'analist', 'report', `Deniz: “${c.title}” için performans raporu hazır.`); publish('campaign', { id: c.id, status: c.status }); }, T.think + T.work);
  return ok({ ok: true }, 202);
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith('/api/')) return realFetch(input, init);
  const path = url.slice(4).split('?')[0];
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : {};
  await wait(120); // ağ gecikmesi hissi
  for (const [m, re, handler] of routes) {
    const match = m === method && path.match(re);
    if (match) {
      const { status, data } = handler(body, match.slice(1));
      return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    }
  }
  return new Response(JSON.stringify({ error: DEMO_ONLY }), { status: 404, headers: { 'Content-Type': 'application/json' } });
};

// ---------- Açılış durumu: örnek kampanyalar + canlı bir kampanya ----------
function seedExamples() {
  const hotel = db.projects.find((p) => p.name === 'HotelFlow');
  const wa = db.projects.find((p) => p.name === 'WhatsApp Rezervasyon Asistanı');
  const a = createCampaign({ project_id: hotel.id, title: 'Sonbahar lansmanı (örnek)', goal: 'Otellerden demo talebi toplamak', channels: 'Instagram, Google Ads', languages: ['en', 'ar'] });
  run(a, { instant: true });
  a.status = 'onaylandi'; a.updated_at = now() - 3600e3;
  const days = [...Array(10)].map((_, i) => `2026-09-${String(14 + i).padStart(2, '0')}`);
  addMetrics(a.id, days.flatMap((d, i) => [
    { day: d, channel: 'Instagram', lang: 'en', impressions: 8000 + i * 450, clicks: 150 + i * 11, conversions: 5 + (i % 4), spend: 420 + i * 12 },
    { day: d, channel: 'Google Ads', lang: 'ar', impressions: 5200 + i * 280, clicks: 95 + i * 6, conversions: 3 + (i % 3), spend: 390 + i * 9 }]));
  report(a, { instant: true });
  const b = createCampaign({ project_id: wa.id, title: 'Kış erken rezervasyon (örnek)', goal: 'Otellere WhatsApp asistanını tanıtmak', channels: 'LinkedIn, Instagram', languages: ['de'] });
  run(b, { instant: true });
  b.status = 'onay_bekliyor'; b.updated_at = now() - 600e3;
  log(a.id, 'mudur', 'decision', 'Kurucu kararı: ONAYLANDI ✅ (örnek)');
  log(b.id, 'mudur', 'approval', `“${b.title}” onayınıza sunuldu.`);
}
seedExamples();

// Sayfa açıldıktan kısa süre sonra canlı bir kampanya başlar: karakterlerin çalışıp evrak taşıdığını izleyin.
setTimeout(() => {
  const clinic = db.projects.find((p) => p.name === 'Clinician OS');
  enqueue(createCampaign({ project_id: clinic.id, title: 'Klinik randevu asistanı tanıtımı', goal: 'Kliniklerden demo talebi', channels: 'Instagram, LinkedIn', languages: ['en', 'ja'] }));
}, 2500);
