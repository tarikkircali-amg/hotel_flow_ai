// Kimlik doğrulama: scrypt ile tuzlu parola, HttpOnly çerezde oturum.
// Organizasyon kimliği her zaman oturumdan türetilir, istekten asla alınmaz.
const crypto = require('crypto');
const { audit } = require('./db');

const COOKIE = 'mos_session';

function hashPassword(pass) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pass, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(pass, stored) {
  const [algo, salt, hash] = String(stored).split(':');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const test = crypto.scryptSync(String(pass), salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

// İlk açılış: organizasyon + yönetici. Parola env'de yoksa rastgele üretilip
// yalnızca bir kez konsola yazılır (varsayılan/paylaşılan parola yok).
function bootstrap(db, cfg, log = console.log) {
  let org = db.one('SELECT * FROM organizations ORDER BY id LIMIT 1');
  if (!org) {
    db.run('INSERT INTO organizations (name, created_at) VALUES (?,?)', [cfg.orgName, Date.now()]);
    org = db.one('SELECT * FROM organizations ORDER BY id LIMIT 1');
  }
  const existing = db.one('SELECT id FROM users WHERE username = ?', [cfg.adminUser]);
  if (!existing) {
    const pass = cfg.adminPassword || crypto.randomBytes(9).toString('base64url');
    db.run('INSERT INTO users (organization_id, username, pass_hash, name, role) VALUES (?,?,?,?,?)',
      [org.id, cfg.adminUser, hashPassword(pass), 'Kurucu', 'owner']);
    if (!cfg.adminPassword) {
      log(`🔐 İlk yönetici oluşturuldu → kullanıcı: ${cfg.adminUser}  parola: ${pass}`);
      log('   Bu parolayı not alın; bir daha gösterilmeyecek. (MOS_ADMIN_PASSWORD ile de belirleyebilirsiniz.)');
    }
  }
  return org;
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((c) => c.trim().split('=')).filter((p) => p[0])
    .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

function login(db, cfg, { username, pass, ip }) {
  const u = db.one('SELECT * FROM users WHERE username = ?', [String(username || '')]);
  if (!u || !verifyPassword(pass || '', u.pass_hash)) {
    audit(db, { username, action: 'login', result: 'fail', ip });
    return null;
  }
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.run('INSERT INTO sessions (token, user_id, organization_id, created_at, expires_at) VALUES (?,?,?,?,?)',
    [token, u.id, u.organization_id, now, now + cfg.sessionTtlMs]);
  audit(db, { orgId: u.organization_id, username: u.username, action: 'login', ip });
  return { token, user: { username: u.username, name: u.name, role: u.role } };
}

function cookieHeader(cfg, token, maxAgeMs) {
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${Math.floor(maxAgeMs / 1000)}`];
  if (cfg.cookieSecure) parts.push('Secure');
  return parts.join('; ');
}

function middleware(db) {
  return (req, res, next) => {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    const s = token && db.one('SELECT * FROM sessions WHERE token = ?', [token]);
    if (!s || s.expires_at < Date.now()) {
      return res.status(401).json({ error: 'Oturumunuz yok veya süresi doldu. Lütfen tekrar giriş yapın.' });
    }
    const u = db.one('SELECT id, username, name, role FROM users WHERE id = ?', [s.user_id]);
    req.user = u;
    req.orgId = s.organization_id; // tek doğru kaynak
    req.token = token;
    next();
  };
}

module.exports = { bootstrap, login, middleware, cookieHeader, hashPassword, verifyPassword, COOKIE };
