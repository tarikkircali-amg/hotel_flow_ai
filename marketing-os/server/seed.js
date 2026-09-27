// İlk açılışta portföy projeleri. Açıklamalar kasıtlı olarak kısa/boş bırakıldı:
// ajans eksik bilgiyi "bilgi gerekli" diye işaretler, uydurmaz. Arayüzden doldurun.
const PORTFOLIO = [
  { name: 'HotelFlow', description: 'Oteller için operasyon yönetimi: ön büro, kat hizmetleri ve raporlama tek ekranda.', color: '#0ea5e9' },
  { name: 'DurakAI', description: '', color: '#f59e0b' },
  { name: 'ZEKAI Travel', description: '', color: '#10b981' },
  { name: 'MediTour', description: '', color: '#ef4444' },
  { name: 'FinFlow', description: '', color: '#8b5cf6' },
];

function seedProjects(db, orgId) {
  const has = db.one('SELECT COUNT(*) AS n FROM projects WHERE organization_id = ?', [orgId]);
  if (has.n > 0) return;
  for (const p of PORTFOLIO) {
    db.run(`INSERT INTO projects (organization_id, name, description, audience, url, tone, color, created_at)
            VALUES (?,?,?,?,?,?,?,?)`, [orgId, p.name, p.description, '', '', '', p.color, Date.now()]);
  }
}

module.exports = { seedProjects, PORTFOLIO };
