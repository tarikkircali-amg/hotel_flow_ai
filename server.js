// ============================================================
// CLUB CALIMERA — HOTEL FLOW AI · BACKEND SUNUCUSU
// 50+ eş zamanlı kullanıcı için REST API + SQLite veritabanı
// ------------------------------------------------------------
// Bu sürüm "node-sqlite3-wasm" kullanır → Windows'ta DERLEME GEREKTİRMEZ.
// (Visual Studio C++ kurmanıza gerek yoktur.)
//
// Çalıştırma:
//   1) npm install
//   2) node server.js
//   3) Tarayıcıda club_calimera_demo.html aç ve BACKEND_CONFIG.mode='backend' yap
// ============================================================

const express = require('express');
const cors = require('cors');
const { Database } = require('node-sqlite3-wasm');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Orta katmanlar ---
app.use(cors());                       // farklı kaynaktan erişime izin (geliştirme)
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public'))); // HTML'i de buradan sunabilirsiniz

// --- Veritabanı (dosyaya kaydeder: calimera.db) ---
const db = new Database('calimera.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL,
    name TEXT, role TEXT, title TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    username TEXT, created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER,
    updated_by TEXT
  );
  CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT, action TEXT, key TEXT, at INTEGER
  );
`);

// --- Yardımcılar ---
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// node-sqlite3-wasm yardımcı sarmalayıcılar (better-sqlite3 benzeri kullanım)
const one = (sql, params = []) => db.get(sql, params);          // tek satır
const many = (sql, params = []) => db.all(sql, params);         // tüm satırlar
const run = (sql, params = []) => db.run(sql, params);          // yazma

// İlk kurulumda demo kullanıcıları oluştur
const seedUsers = [
  ['admin', 'admin', 'Ahmet Yılmaz', 'admin', 'Ön Büro Müdürü'],
  ['resepsiyon', '1234', 'Elif Demir', 'reception', 'Resepsiyon'],
  ['kat', '1234', 'Ayşe Kaya', 'housekeeping', 'Kat Hizmetleri'],
  ['rapor', '1234', 'Mehmet Öz', 'readonly', 'Raporlama'],
];
seedUsers.forEach(([u, p, n, r, t]) =>
  run('INSERT OR IGNORE INTO users (username, pass_hash, name, role, title) VALUES (?,?,?,?,?)',
      [u, sha(p), n, r, t])
);

// Oturum doğrulama orta katmanı
function auth(req, res, next) {
  const token = req.headers['x-session'];
  if (!token) return res.status(401).json({ error: 'Oturum yok' });
  const s = one('SELECT * FROM sessions WHERE token = ?', [token]);
  if (!s) return res.status(401).json({ error: 'Geçersiz oturum' });
  req.user = one('SELECT username, name, role, title FROM users WHERE username = ?', [s.username]);
  next();
}

// --- LOGIN ---
app.post('/api/login', (req, res) => {
  const { username, pass } = req.body;
  const u = one('SELECT * FROM users WHERE username = ?', [username]);
  if (!u || u.pass_hash !== sha(pass || '')) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  run('INSERT INTO sessions (token, username, created_at) VALUES (?,?,?)', [token, username, Date.now()]);
  res.json({ token, user: { username: u.username, name: u.name, role: u.role, title: u.title } });
});

app.post('/api/logout', auth, (req, res) => {
  run('DELETE FROM sessions WHERE token = ?', [req.headers['x-session']]);
  res.json({ ok: true });
});

// --- VERİ: tümünü çek ---
app.get('/api/data', auth, (req, res) => {
  const rows = many('SELECT key, value FROM kv');
  const out = {};
  rows.forEach(r => { try { out[r.key] = JSON.parse(r.value); } catch(e){ out[r.key] = r.value; } });
  res.json(out);
});

// --- VERİ: tek anahtar yaz (50 kullanıcı aynı anda yazabilir) ---
app.put('/api/data/:key', auth, (req, res) => {
  // readonly rol yazamaz
  if (req.user.role === 'readonly') return res.status(403).json({ error: 'Yetki yok' });
  const key = req.params.key;
  const value = JSON.stringify(req.body.value);
  run(`INSERT INTO kv (key, value, updated_at, updated_by) VALUES (?,?,?,?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by`,
      [key, value, Date.now(), req.user.username]);
  run('INSERT INTO audit (username, action, key, at) VALUES (?,?,?,?)',
      [req.user.username, 'write', key, Date.now()]);
  res.json({ ok: true });
});

// --- Sağlık kontrolü (Railway healthcheck) ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

// --- Çevrimiçi kullanıcı sayısı (son 5 dk) ---
app.get('/api/online', auth, (req, res) => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  const n = one('SELECT COUNT(DISTINCT username) c FROM sessions WHERE created_at > ?', [cutoff]);
  res.json({ online: n.c });
});

app.listen(PORT, () => {
  console.log(`✅ Club Calimera backend çalışıyor: http://localhost:${PORT}`);
  console.log(`   Demo kullanıcılar: admin/admin, resepsiyon/1234, kat/1234, rapor/1234`);
});
