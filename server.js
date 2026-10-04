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
app.set('trust proxy', 1);             // Railway/vekil arkasinda gercek istemci IP'si
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
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, hotel TEXT NOT NULL, email TEXT NOT NULL,
    phone TEXT, rooms TEXT, message TEXT,
    consent_at INTEGER NOT NULL,
    source TEXT, created_at INTEGER NOT NULL
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

// ============================================================
// DEMO TALEP FORMU (public/index.html → POST /api/contact)
// Herkese açık uçtur: doğrulama + hız sınırı + KVKK rızası zorunlu.
// ============================================================

// Basit, bellek içi hız sınırı. Tek örnek (instance) için yeterlidir;
// çok örnekli dağıtımda Redis tabanlı bir sınırlayıcıya taşınmalıdır.
//
// İki ayrı kova kullanılır. Doğrulama hatası (400) KAYIT kovasını tüketmez:
// e-postasını yanlış yazan bir kullanıcı kendini formdan kilitlemiş olmaz.
// Sel/kötüye kullanım ayrı ve daha gevşek bir DENEME kovasıyla engellenir.
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  attempts: 30,      // her istek (hatalı doğrulama dâhil)
  submissions: 5,    // yalnızca başarıyla kaydedilen talepler
};
const rateBuckets = new Map();   // ip -> { attempts: number[], submissions: number[] }

function bucketFor(ip) {
  if (rateBuckets.size > 5000) rateBuckets.clear();   // sınırsız bellek büyümesini önle
  if (!rateBuckets.has(ip)) rateBuckets.set(ip, { attempts: [], submissions: [] });
  return rateBuckets.get(ip);
}

// Kovadaki süresi geçmiş kayıtları atar ve sınırın aşıldığını bildirir.
function overLimit(ip, kind) {
  const bucket = bucketFor(ip);
  const now = Date.now();
  bucket[kind] = bucket[kind].filter(t => now - t < RATE_LIMIT.windowMs);
  return bucket[kind].length >= RATE_LIMIT[kind];
}

function record(ip, kind) {
  bucketFor(ip)[kind].push(Date.now());
}

const trim = (v, max) => String(v ?? '').trim().slice(0, max);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Hata mesajları ne olduğunu, nedenini ve nasıl düzeltileceğini söyler.
function validateLead(body) {
  const lead = {
    name:    trim(body.name, 120),
    hotel:   trim(body.hotel, 160),
    email:   trim(body.email, 160),
    phone:   trim(body.phone, 40),
    rooms:   trim(body.rooms, 40),
    message: trim(body.message, 2000),
  };
  if (lead.name.length < 2)  return { error: 'Ad soyad alanı en az 2 karakter olmalı.' };
  if (lead.hotel.length < 2) return { error: 'Otel adı alanı en az 2 karakter olmalı.' };
  if (!EMAIL_PATTERN.test(lead.email)) {
    return { error: 'E-posta adresi geçerli görünmüyor. “ad@otel.com” biçiminde yazın.' };
  }
  if (body.consent !== true && body.consent !== 'on' && body.consent !== 'true') {
    return { error: 'KVKK onayı olmadan talebi kaydedemiyoruz. Onay kutusunu işaretleyin.' };
  }
  return { lead };
}

app.post('/api/contact', (req, res) => {
  const tooManyAttempts = overLimit(req.ip, 'attempts');
  const tooManySubmissions = overLimit(req.ip, 'submissions');
  if (tooManyAttempts || tooManySubmissions) {
    return res.status(429).json({
      error: 'Kısa sürede çok fazla talep gönderildi. Birkaç dakika sonra tekrar deneyin ' +
             'veya info@inovatifzeka.com adresine yazın.'
    });
  }
  record(req.ip, 'attempts');

  // Doğrulama hatası kayıt kovasını tüketmez — kullanıcı düzeltip tekrar gönderebilir.
  const { error, lead } = validateLead(req.body || {});
  if (error) return res.status(400).json({ error });

  const now = Date.now();
  try {
    run(`INSERT INTO leads (name, hotel, email, phone, rooms, message, consent_at, source, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [lead.name, lead.hotel, lead.email, lead.phone, lead.rooms, lead.message,
         now, 'web:index', now]);
    run('INSERT INTO audit (username, action, key, at) VALUES (?,?,?,?)',
        ['anonim', 'lead_created', lead.email, now]);
  } catch (e) {
    console.error('[contact] kayıt başarısız:', e.message);
    return res.status(500).json({
      error: 'Talebiniz kaydedilemedi; sorun bizde. info@inovatifzeka.com adresine ' +
             'doğrudan yazabilirsiniz.'
    });
  }

  record(req.ip, 'submissions');
  res.status(201).json({
    ok: true,
    message: 'Talebiniz bize ulaştı. Bir iş günü içinde e-posta ile dönüş yapacağız.'
  });
});

// Talepleri okumak YÖNETİCİ yetkisi ister — herkese açık değildir.
app.get('/api/leads', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetki yok' });
  run('INSERT INTO audit (username, action, key, at) VALUES (?,?,?,?)',
      [req.user.username, 'lead_export', 'leads', Date.now()]);
  res.json({ leads: many('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500') });
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
