'use strict';

// Depo secici.
//
// DEMO_MOD=true  -> bellek ici depo (Postgres gerekmez, veri diskte kalmaz)
// aksi halde     -> PostgreSQL
//
// Iki uygulama da ayni arayuzu sunar; ajan, panel ve Twilio katmani
// hangisinin kullanildigini bilmez.

const demoMod = String(process.env.DEMO_MOD ?? '').toLowerCase() === 'true';

const { denetimDetayiTemizle } = require('./gizlilik');

const depo = demoMod ? require('./db-bellek') : require('./db-pg');

// Denetim yazimini TEK NOKTADAN geciriyoruz (spesifikasyon §11).
// 16 ayri cagri yerinde tek tek dikkat etmeye guvenmek yerine, ham
// icerigin denetim kaydina sizmasini burada engelliyoruz.
const denetim = (kayit) =>
  depo.denetim({ ...kayit, detay: denetimDetayiTemizle(kayit?.detay) });

module.exports = { ...depo, denetim };
module.exports.demoMod = demoMod;
