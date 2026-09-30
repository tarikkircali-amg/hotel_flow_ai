'use strict';

// Semayi uygular. Tekrar calistirilabilir (hepsi IF NOT EXISTS).

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL tanimli degil. .env dosyanizi kontrol edin.');
  process.exit(1);
}

const havuz = new Pool({
  connectionString: url,
  ssl: String(process.env.DB_SSL).toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
});

(async () => {
  const sema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  try {
    await havuz.query(sema);
    console.log('Sema uygulandi.');
  } catch (err) {
    console.error('Sema uygulanamadi:', err.message);
    process.exitCode = 1;
  } finally {
    await havuz.end();
  }
})();
