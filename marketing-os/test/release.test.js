// Onay sonrası: kreatif üretimi, yayın köprüsü izinleri ve webhook imzası.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { setup, approvedCampaign } = require('./helpers');
const { renderCreative, contrast, wrap } = require('../server/creative');

test('kreatif: metin kaçışlı, okunmaz renk AA kontrasta düzeltilir, 3 format', () => {
  const svg = renderCreative({ headline: '<script>x</script>', subline: 's', cta: 'Dene', bg: '#ffffff', fg: '#eeeeee', accent: 'kırmızı' });
  assert.ok(!svg.includes('<script>'));
  const fill = svg.match(/font-weight="900" fill="(#[0-9a-f]{6})"/i)[1];
  assert.ok(contrast(fill, '#ffffff') >= 4.5);
  for (const f of ['square', 'story', 'wide']) assert.match(renderCreative({ headline: 'a' }, { format: f }), /<svg/);
  assert.throws(() => renderCreative({}, { format: 'dev' }));
  assert.ok(wrap('çok uzun bir başlık '.repeat(20), 96, 900, 3).length === 3);
});

test('kreatif ucu yalnızca oturumla ve kendi kampanyası için çalışır', async () => {
  const t = await setup();
  const { cookie, id } = await approvedCampaign(t);
  const ok = await fetch(`${t.base}/campaigns/${id}/creative/story.svg`, { headers: { cookie } });
  assert.strictEqual(ok.status, 200);
  assert.match(ok.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(await ok.text(), /height="1920"/);
  assert.strictEqual((await fetch(`${t.base}/campaigns/${id}/creative/story.svg`)).status, 401);
  assert.strictEqual((await fetch(`${t.base}/campaigns/${id}/creative/dev.svg`, { headers: { cookie } })).status, 400);
  t.server.close();
});

test('yayın: onaysız/teyitsiz/köprüsüz gönderim reddedilir', async () => {
  const t = await setup();
  const { cookie, id } = await approvedCampaign(t);
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/publish`, 'POST', { confirm: true })).status, 409, 'önce onay');
  await t.call(cookie, `/campaigns/${id}/decision`, 'POST', { decision: 'approve' });
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/publish`, 'POST', {})).status, 400, 'teyit şart');
  const r = await t.call(cookie, `/campaigns/${id}/publish`, 'POST', { confirm: true });
  assert.strictEqual(r.status, 400);
  assert.match(r.data.error, /MOS_PUBLISH_WEBHOOK_URL/);
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}`)).data.status, 'onaylandi');
  t.server.close();
});

test('yayın: imzalı taslak paketi gönderilir, durum ve denetim güncellenir', async () => {
  const sent = [];
  const fetchImpl = async (url, opts) => { sent.push({ url, ...opts }); return { ok: true, status: 200 }; };
  const t = await setup({ config: { publishWebhookUrl: 'https://hooks.example.test/x', publishSecret: 'gizli' }, fetchImpl });
  const { cookie, id } = await approvedCampaign(t);
  await t.call(cookie, `/campaigns/${id}/decision`, 'POST', { decision: 'approve' });
  assert.strictEqual((await t.call(cookie, '/me')).data.publishEnabled, true);
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/publish`, 'POST', { confirm: true })).status, 200);
  assert.strictEqual(sent.length, 1);
  const body = JSON.parse(sent[0].body);
  assert.strictEqual(body.publish_as, 'draft');
  assert.strictEqual(body.deliverables.length, 8);
  assert.match(body.creatives.wide.svg, /width="1920"/);
  const expected = 'sha256=' + crypto.createHmac('sha256', 'gizli').update(sent[0].body).digest('hex');
  assert.strictEqual(sent[0].headers['X-MOS-Signature'], expected);
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}`)).data.status, 'yayina_gonderildi');
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/publish`, 'POST', { confirm: true })).status, 409, 'iki kez gönderilmez');
  assert.ok(t.db.one("SELECT 1 AS x FROM audit WHERE action = 'campaign.publish' AND result = 'ok'"));
  t.server.close();
});

test('yayın: webhook hatasında durum değişmez, anlaşılır hata döner', async () => {
  const fetchImpl = async () => ({ ok: false, status: 500 });
  const t = await setup({ config: { publishWebhookUrl: 'https://hooks.example.test/x' }, fetchImpl });
  const { cookie, id } = await approvedCampaign(t);
  await t.call(cookie, `/campaigns/${id}/decision`, 'POST', { decision: 'approve' });
  const r = await t.call(cookie, `/campaigns/${id}/publish`, 'POST', { confirm: true });
  assert.strictEqual(r.status, 502);
  assert.match(r.data.error, /HTTP 500/);
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}`)).data.status, 'onaylandi');
  t.server.close();
});
