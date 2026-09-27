// Veritabanı katmanı — node-sqlite3-wasm (Windows'ta derleme gerektirmez).
// Kural: her iş satırı organization_id taşır; sorgular org'u oturumdan alır.
const fs = require('fs');
const path = require('path');
const { Database } = require('node-sqlite3-wasm');

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at INTEGER);
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL,
      username TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL, name TEXT, role TEXT);
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, organization_id INTEGER NOT NULL,
      created_at INTEGER, expires_at INTEGER);
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL,
      name TEXT NOT NULL, description TEXT, audience TEXT, url TEXT, tone TEXT,
      color TEXT, created_at INTEGER);
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL, title TEXT NOT NULL, goal TEXT, channels TEXT,
      budget_note TEXT, status TEXT NOT NULL, round INTEGER DEFAULT 1,
      revision_note TEXT, decision_note TEXT, mode TEXT,
      created_at INTEGER, updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS deliverables (
      id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL, round INTEGER NOT NULL, agent_id TEXT NOT NULL,
      title TEXT, body TEXT, data TEXT, confidence TEXT, created_at INTEGER);
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL,
      campaign_id INTEGER, agent_id TEXT, kind TEXT, text TEXT, at INTEGER);
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER, username TEXT,
      action TEXT, target TEXT, result TEXT, ip TEXT, at INTEGER);
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL, kind TEXT, mime TEXT, data TEXT, prompt TEXT, provider TEXT, created_at INTEGER);
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL, day TEXT NOT NULL, channel TEXT NOT NULL, lang TEXT DEFAULT '',
      impressions INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0,
      spend REAL DEFAULT 0, source TEXT, updated_at INTEGER,
      UNIQUE(campaign_id, day, channel, lang));
    CREATE INDEX IF NOT EXISTS ix_camp_org ON campaigns(organization_id, status);
    CREATE INDEX IF NOT EXISTS ix_metrics_camp ON metrics(campaign_id, day);
    CREATE INDEX IF NOT EXISTS ix_assets_camp ON assets(campaign_id, id);
    CREATE INDEX IF NOT EXISTS ix_deliv_camp ON deliverables(campaign_id, round);
    CREATE INDEX IF NOT EXISTS ix_act_org ON activity(organization_id, id);
  `);
  migrate(db);
  return {
    raw: db,
    one: (sql, p = []) => db.get(sql, p),
    many: (sql, p = []) => db.all(sql, p),
    run: (sql, p = []) => db.run(sql, p),
  };
}

// Eski veritabanlarına yeni sütunları ekler (veri kaybı olmadan).
const COLUMNS = [
  ['projects', 'site_notes', 'TEXT'], ['projects', 'site_fetched_at', 'INTEGER'],
  ['campaigns', 'languages', "TEXT DEFAULT 'tr'"],
  ['organizations', 'ingest_token', 'TEXT'],
  ['organizations', 'brand_url', 'TEXT'], ['organizations', 'brand_notes', 'TEXT'], ['organizations', 'brand_fetched_at', 'INTEGER'],
];
function migrate(db) {
  for (const [table, col, type] of COLUMNS) {
    const has = db.all(`PRAGMA table_info(${table})`).some((c) => c.name === col);
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  }
}

function audit(db, { orgId, username, action, target, result = 'ok', ip = '' }) {
  db.run('INSERT INTO audit (organization_id, username, action, target, result, ip, at) VALUES (?,?,?,?,?,?,?)',
    [orgId ?? null, username || '-', action, String(target ?? ''), result, ip, Date.now()]);
}

module.exports = { open, audit };
