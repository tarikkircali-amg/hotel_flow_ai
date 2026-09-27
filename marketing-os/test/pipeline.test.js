// Demo modunda uçtan uca akış + kiracı izolasyonu + onay kuralları.
const test = require('node:test');
const assert = require('node:assert');
const { setup, waitFor } = require('./helpers');
const { hashPassword } = require('../server/auth');

test('yanlış parola reddedilir, API oturumsuz kapalıdır', async () => {
  const t = await setup();
  assert.strictEqual((await t.login('kurucu', 'yanlis')).status, 401);
  assert.strictEqual((await t.call('', '/projects')).status, 401);
  t.server.close();
});

test('brif → 8 teslimat → onay bekliyor → onay', async () => {
  const t = await setup();
  const { cookie } = await t.login('kurucu', 'test-parola-123');
  const projects = (await t.call(cookie, '/projects')).data;
  assert.strictEqual(projects.length, 6, "sitedeki 6 ürün");
  assert.ok(!projects.some((p) => p.name === "FinFlow"));
  assert.match(projects.find((p) => p.name === "Clinician OS").description, /randevu/);
  const hotel = projects.find((p) => p.name === 'HotelFlow');
  const created = await t.call(cookie, '/campaigns', 'POST', { project_id: hotel.id, title: 'Sonbahar', goal: 'Demo talebi' });
  assert.strictEqual(created.status, 201);
  const id = created.data.id;
  assert.ok(await waitFor(async () => (await t.call(cookie, `/campaigns/${id}`)).data.status === 'onay_bekliyor'));
  const c = (await t.call(cookie, `/campaigns/${id}`)).data;
  assert.strictEqual(c.deliverables.length, 8);
  assert.ok(c.deliverables.find((d) => d.agent_id === 'tasarimci').data.visual.headline);
  assert.match(c.deliverables[0].body, /Demo modu/);

  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/decision`, 'POST', { decision: 'revise' })).status, 400, 'notsuz revizyon olmaz');
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/decision`, 'POST', { decision: 'approve' })).status, 200);
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}`)).data.status, 'onaylandi');
  assert.strictEqual((await t.call(cookie, `/campaigns/${id}/decision`, 'POST', { decision: 'approve' })).status, 409, 'iki kez onaylanamaz');
  const audit = t.db.many("SELECT action FROM audit WHERE action LIKE 'campaign.%'").map((r) => r.action);
  assert.deepStrictEqual(audit, ['campaign.create', 'campaign.approve']);
  t.server.close();
});

test('revizyon yeni tur başlatır ve notu ajanlara iletir', async () => {
  const t = await setup();
  const { cookie } = await t.login('kurucu', 'test-parola-123');
  const [p] = (await t.call(cookie, '/projects')).data;
  const id = (await t.call(cookie, '/campaigns', 'POST', { project_id: p.id, title: 'X' })).data.id;
  await waitFor(async () => (await t.call(cookie, `/campaigns/${id}`)).data.status === 'onay_bekliyor');
  await t.call(cookie, `/campaigns/${id}/decision`, 'POST', { decision: 'revise', note: 'Daha samimi olsun' });
  assert.ok(await waitFor(async () => {
    const c = (await t.call(cookie, `/campaigns/${id}`)).data;
    return c.round === 2 && c.status === 'onay_bekliyor';
  }));
  const c = t.db.one('SELECT * FROM campaigns WHERE id = ?', [id]);
  const prompt = t.pipeline.buildPrompt({ p, c, prior: [] });
  assert.match(prompt, /REVİZYON NOTU.*Daha samimi olsun/);
  t.server.close();
});

test('başka organizasyon verisi görülemez', async () => {
  const t = await setup();
  t.db.run("INSERT INTO organizations (name, created_at) VALUES ('Diğer', 0)");
  const other = t.db.one("SELECT id FROM organizations WHERE name = 'Diğer'").id;
  t.db.run('INSERT INTO users (organization_id, username, pass_hash, name, role) VALUES (?,?,?,?,?)',
    [other, 'yabanci', hashPassword('baska-parola-1'), 'Y', 'owner']);
  const a = await t.login('kurucu', 'test-parola-123');
  const [p] = (await t.call(a.cookie, '/projects')).data;
  const id = (await t.call(a.cookie, '/campaigns', 'POST', { project_id: p.id, title: 'Gizli' })).data.id;
  const b = await t.login('yabanci', 'baska-parola-1');
  assert.strictEqual((await t.call(b.cookie, '/projects')).data.length, 0);
  assert.strictEqual((await t.call(b.cookie, `/campaigns/${id}`)).status, 404);
  assert.strictEqual((await t.call(b.cookie, '/campaigns', 'POST', { project_id: p.id, title: 'Sız' })).status, 400);
  t.server.close();
});
