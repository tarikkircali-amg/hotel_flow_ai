// Çok dilli kampanya, site içe aktarma (SSRF), AI görsel, ölçüm + rapor.
const test = require('node:test');
const assert = require('node:assert');
const { setup, waitFor } = require('./helpers');

async function campaign(t, body) {
  const { cookie } = await t.login('kurucu', 'test-parola-123');
  const p = (await t.call(cookie, '/projects')).data.find((x) => x.name === 'HotelFlow');
  const id = (await t.call(cookie, '/campaigns', 'POST', { project_id: p.id, title: 'Global', ...body })).data.id;
  assert.ok(await waitFor(async () => (await t.call(cookie, `/campaigns/${id}`)).data.status === 'onay_bekliyor'));
  return { cookie, id, p };
}

test('çok dilli: her hedef dil için Lara teslimatı, RTL ve CJK kreatif', async () => {
  const t = await setup();
  const { cookie, id } = await campaign(t, { languages: ['de', 'ar', 'ja', 'xx', 'de'] });
  const c = (await t.call(cookie, `/campaigns/${id}`)).data;
  assert.strictEqual(c.languages, 'tr,de,ar,ja');
  const lokal = c.deliverables.filter((d) => d.agent_id.startsWith('lokal:'));
  assert.deepStrictEqual(lokal.map((d) => d.agent_id), ['lokal:de', 'lokal:ar', 'lokal:ja']);
  assert.strictEqual(lokal[1].data.dir, 'rtl');
  assert.ok(lokal[0].data.back_translation);
  assert.strictEqual(c.deliverables.at(-1).agent_id, 'mudur:review');
  const ar = await (await fetch(`${t.base}/campaigns/${id}/creative/square.svg?lang=ar`, { headers: { cookie } })).text();
  assert.match(ar, /direction="rtl"/);
  assert.match(ar, /جرّبه مجانًا/);
  const ja = await (await fetch(`${t.base}/campaigns/${id}/creative/story.svg?lang=ja`, { headers: { cookie } })).text();
  assert.match(ja, /無料で試す/);
  assert.strictEqual((await fetch(`${t.base}/campaigns/${id}/creative/story.svg?lang=fr`, { headers: { cookie } })).status, 404, 'seçilmeyen dil yok');
  t.server.close();
});

test('site içe aktarma: içerik çıkarılır, notlar ajan istemine girer', async () => {
  const html = '<html lang="tr"><head><title>HotelFlow</title><meta name="description" content="Oteller için akıllı operasyon."></head>'
    + '<body><script>x()</script><h1>Otelinizi tek ekrandan yönetin</h1><p>Ön büro, kat hizmetleri ve raporlama tek panelde birleşir.</p></body></html>';
  const fetchImpl = async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  const lookup = async () => [{ address: '93.184.216.34' }];
  const t = await setup({ fetchImpl, lookup });
  const { cookie } = await t.login('kurucu', 'test-parola-123');
  const p = (await t.call(cookie, '/projects')).data.find((x) => x.name === 'HotelFlow');
  const r = await t.call(cookie, `/projects/${p.id}/import-site`, 'POST', { url: 'https://ornek-otel.com' });
  assert.strictEqual(r.status, 200);
  assert.match(r.data.notes, /tek ekrandan/);
  assert.ok(!r.data.notes.includes('x()'));
  assert.strictEqual(r.data.suggestion.description, 'Oteller için akıllı operasyon.');
  const saved = t.db.one('SELECT * FROM projects WHERE id = ?', [p.id]);
  const prompt = t.pipeline.buildPrompt({ p: saved, c: { title: 'x', languages: 'tr' }, prior: [] });
  assert.match(prompt, /<web_sitesi_notlari/);
  t.server.close();
});

test('site içe aktarma: yerel/özel adresler ve http dışı şemalar engellenir', async () => {
  let called = 0;
  const t = await setup({ fetchImpl: async () => { called++; return new Response(''); }, lookup: async () => [{ address: '10.0.0.5' }] });
  const { cookie } = await t.login('kurucu', 'test-parola-123');
  const [p] = (await t.call(cookie, '/projects')).data;
  for (const url of ['http://127.0.0.1:4000/api', 'file:///etc/passwd', 'https://ic-ag.local', 'http://[::1]/']) {
    const r = await t.call(cookie, `/projects/${p.id}/import-site`, 'POST', { url });
    assert.strictEqual(r.status, 400, url);
  }
  assert.strictEqual(called, 0, 'hiçbir istek dışarı çıkmamalı');
  t.server.close();
});

test('AI görsel: kapalıyken anlaşılır hata; açıkken üretilir ve kreatife gömülür', async () => {
  const off = await setup();
  const a = await campaign(off, {});
  const r0 = await off.call(a.cookie, `/campaigns/${a.id}/image`, 'POST');
  assert.strictEqual(r0.status, 400);
  assert.match(r0.data.error, /MOS_IMAGE_PROVIDER/);
  off.server.close();

  const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
  const calls = [];
  const fetchImpl = async (url, opts) => { calls.push({ url, opts }); return new Response(JSON.stringify({ data: [{ b64_json: png }] }), { status: 200 }); };
  const t = await setup({ config: { imageProvider: 'openai', openaiKey: 'sk-test' }, fetchImpl });
  const { cookie, id } = await campaign(t, {});
  assert.strictEqual((await t.call(cookie, '/me')).data.imageEnabled, true);
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/image`, 'POST')).status, 200);
  assert.match(calls[0].url, /api\.openai\.com/);
  assert.match(JSON.parse(calls[0].opts.body).prompt, /no text/);
  const img = await fetch(`${t.base}/campaigns/${id}/image`, { headers: { cookie } });
  assert.strictEqual(img.headers.get('content-type'), 'image/png');
  const svg = await (await fetch(`${t.base}/campaigns/${id}/creative/wide.svg`, { headers: { cookie } })).text();
  assert.match(svg, /<image href="data:image\/png;base64,/);
  t.server.close();
});

test('ölçüm: doğrulama, KPI, Bearer ile alım, kiracı sınırı, rapor', async () => {
  const t = await setup();
  const { cookie, id } = await campaign(t, {});
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/report`, 'POST')).status, 400, 'veri yokken rapor yok');
  const bad = await t.call(cookie, `/campaigns/${id}/metrics`, 'POST', { rows: [{ day: '27.09.2026', channel: 'x' }] });
  assert.strictEqual(bad.status, 400);
  const rows = [
    { day: '2026-09-20', channel: 'Instagram', impressions: 10000, clicks: 200, conversions: 10, spend: 500 },
    { day: '2026-09-21', channel: 'LinkedIn', lang: 'de', impressions: 5000, clicks: 50, conversions: 5, spend: 400 },
  ];
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/metrics`, 'POST', { rows })).status, 200);
  const m = (await t.call(cookie, `/campaigns/${id}/metrics`)).data;
  assert.strictEqual(m.totals.clicks, 250);
  assert.strictEqual(m.totals.ctr, 250 / 15000);
  assert.strictEqual(m.totals.cpa, 900 / 15);
  assert.strictEqual(m.byChannel[0].key, 'Instagram');

  const token = (await t.call(cookie, '/settings/integrations/rotate', 'POST')).data.token;
  assert.ok(!t.db.one('SELECT ingest_token FROM organizations').ingest_token.includes(token), 'açık anahtar saklanmaz');
  const ingest = (auth, body) => fetch(`${t.base}/ingest/metrics`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body: JSON.stringify(body) });
  const payload = { campaign_id: id, rows: [{ day: '2026-09-20', channel: 'Instagram', impressions: 12000, clicks: 240, conversions: 12, spend: 600 }] };
  assert.strictEqual((await ingest('Bearer yanlis', payload)).status, 401);
  assert.strictEqual((await ingest(`Bearer ${token}`, { ...payload, campaign_id: 9999 })).status, 404);
  assert.strictEqual((await ingest(`Bearer ${token}`, payload)).status, 200);
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/metrics`)).data.totals.clicks, 290, 'aynı gün+kanal güncellenir');

  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/report`, 'POST')).status, 202);
  assert.ok(await waitFor(async () => (await t.call(cookie, `/campaigns/${id}`)).data.deliverables.some((d) => d.agent_id === 'analist:rapor')));
  const rep = (await t.call(cookie, `/campaigns/${id}`)).data.deliverables.find((d) => d.agent_id === 'analist:rapor');
  assert.match(rep.body, /Instagram/);
  t.server.close();
});

test('yedek: yalnızca sahip indirir, geçerli SQLite dosyası döner', async () => {
  const os = require('os'); const path = require('path'); const fs = require('fs');
  const file = path.join(os.tmpdir(), `mos-test-${Date.now()}.db`);
  const { open } = require('../server/db');
  const t = await setup({ config: { dbFile: file }, db: open(file) });
  const { cookie } = await t.login('kurucu', 'test-parola-123');
  const r = await fetch(`${t.base}/settings/backup`, { headers: { cookie } });
  assert.strictEqual(r.status, 200);
  const buf = Buffer.from(await r.arrayBuffer());
  assert.strictEqual(buf.subarray(0, 15).toString(), 'SQLite format 3');
  t.db.run("UPDATE users SET role = 'editor'");
  assert.strictEqual((await fetch(`${t.base}/settings/backup`, { headers: { cookie } })).status, 403);
  t.server.close();
  fs.rmSync(file, { force: true });
});
