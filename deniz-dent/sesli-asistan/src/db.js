'use strict';

// Depo secici.
//
// DEMO_MOD=true  -> bellek ici depo (Postgres gerekmez, veri diskte kalmaz)
// aksi halde     -> PostgreSQL
//
// Iki uygulama da ayni arayuzu sunar; ajan, panel ve Twilio katmani
// hangisinin kullanildigini bilmez.

const demoMod = String(process.env.DEMO_MOD ?? '').toLowerCase() === 'true';

module.exports = demoMod ? require('./db-bellek') : require('./db-pg');
module.exports.demoMod = demoMod;
