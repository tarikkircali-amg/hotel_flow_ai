// Testler için ortak kurulum: bellek içi DB, demo modu, gerçek HTTP sunucusu.
const { createApp } = require('../server/index');
const { open } = require('../server/db');

const cfg = {
  ...require('../server/config'), dbFile: ':memory:', adminUser: 'kurucu', adminPassword: 'test-parola-123',
  demoDelayMs: 0, anthropicKey: '',
};

async function setup({ config: over = {}, fetchImpl, lookup, db = open(':memory:') } = {}) {
  const { app, pipeline } = createApp({ config: { ...cfg, ...over }, db, client: null, sleep: async () => {}, log: () => {}, fetchImpl, lookup });
  const server = app.listen(0);
  server.unref(); // başarısız bir test süreci askıda bırakmasın
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const login = async (username, pass) => {
    const r = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, pass }) });
    return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
  };
  const call = (cookie, path, method = 'GET', body) => fetch(`${base}${path}`, {
    method, headers: { cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => null) }));
  return { db, server, pipeline, login, call, base };
}

const waitFor = async (fn, ms = 3000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 20)); }
  return false;
};


async function approvedCampaign(t) {
  const { cookie } = await t.login('kurucu', 'test-parola-123');
  const p = (await t.call(cookie, '/projects')).data.find((x) => x.name === 'HotelFlow');
  const id = (await t.call(cookie, '/campaigns', 'POST', { project_id: p.id, title: 'Kış' })).data.id;
  await waitFor(async () => (await t.call(cookie, `/campaigns/${id}`)).data.status === 'onay_bekliyor');
  return { cookie, id };
}

module.exports = { setup, waitFor, approvedCampaign };
