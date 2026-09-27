// Portföy ve marka kimliği — kaynak: https://www.myinovatifzeka.com (27.09.2026'da okundu).
// Kurallar: yalnızca sitede yazanlar kullanılır; kullanıcının düzenlediği alanların üzerine yazılmaz
// (yalnızca BOŞ alanlar doldurulur), sadece eksik ürünler eklenir. Geçerli portföy: sitedeki 6 ürün.
const SITE = 'https://www.myinovatifzeka.com';
const SEEDED_AT = Date.parse('2026-09-27T12:00:00Z');

const PORTFOLIO = [
  { name: 'HotelFlow', color: '#0ea5e9', description: 'Otel operasyonunu tek ekranda toplayan akıllı yönetim platformu (Hotel Flow AI).', audience: 'Oteller ve otel yöneticileri' },
  { name: 'WhatsApp Rezervasyon Asistanı', color: '#22c55e', description: 'Misafir kendi dilinde yazar, ekibiniz Türkçe görür; rezervasyon konuşmadan kendiliğinden oluşur.', audience: 'Oteller ve konaklama işletmeleri' },
  { name: 'ZEKAI Travel', color: '#10b981', description: 'Acente operasyonunu uçtan uca yöneten platform (ZEKAI Travel AI).', audience: 'Seyahat acenteleri' },
  { name: 'MediTour', color: '#ef4444', description: 'Sağlık turizmini uçtan uca koordine eden çözüm.', audience: 'Sağlık turizmi kurumları ve acenteleri' },
  { name: 'DurakAI', color: '#f59e0b', description: 'Transfer, tur ve servis araçlarınızı canlı takip eden sistem.', audience: 'Transfer, tur ve servis operatörleri' },
  { name: 'Clinician OS', color: '#6366f1', description: 'Klinikler için randevu, hasta kaydı ve gelen kutusunu okuyan yapay zekâ asistanı.', audience: 'Klinikler' },
];

const BRAND_NOTES = `Kaynak: ${SITE}
Şirket: My İnovatif Zeka
Slogan: "Turizmi biz de yönettik. Çözümünü biz üretiyoruz."
Konumlandırma: 30 yılı aşkın otelcilik ve turizm saha deneyimi; sektörün gerçek sorunlarını düşünüp çözümünü tasarlayan ve kendi yazılımını üreten ekip. "Dışarıdan alınan değil — sahadan doğan yapay zeka."
Yaklaşım (üç durak): Düşünüyoruz (sahada 30+ yıl; otelin, acentenin, transferin nerede tıkandığını biliyoruz) · Tasarlıyoruz (her çözüm işin gerçek akışına göre, şablon değil) · Üretiyoruz (yazılımı biz yazıyoruz, biz işletiyoruz).
Sitedeki rakamlar: 30+ yıl saha deneyimi · 350+ yönetilen otel · 6 akıllı ürün.
Konum: İzmir — "Ege'den dünyaya".
Ürünler: Hotel Flow AI · WhatsApp Rezervasyon Asistanı · ZEKAI Travel AI · MediTour · DurakAI · Clinician OS.
Çağrı: "İşletmeniz hakkında konuşalım — operasyonunuzu anlatın, 24 saat içinde size özel bir çözüm önerisiyle dönelim."
Ton (siteden çıkarım): sahadan gelen, deneyimli, samimi, iddiasız ama kendinden emin; Türkçe, kısa cümleler.`;

// Portföyden çıkarılan ürünler: eski kurulumlarda, kampanyası yoksa silinir (veri kaybı olmasın diye
// kampanyası olan proje korunur ve uyarı yazılır).
const RETIRED = ['FinFlow'];

function retireProjects(db, orgId, log) {
  for (const name of RETIRED) {
    const row = db.one('SELECT id FROM projects WHERE organization_id = ? AND name = ?', [orgId, name]);
    if (!row) continue;
    const used = db.one('SELECT COUNT(*) AS n FROM campaigns WHERE project_id = ?', [row.id]).n;
    if (used) { log(`⚠️  "${name}" portföyden çıkarıldı ama ${used} kampanyası olduğu için silinmedi.`); continue; }
    db.run('DELETE FROM projects WHERE id = ?', [row.id]);
  }
}

function seedProjects(db, orgId, log = () => {}) {
  retireProjects(db, orgId, log);
  const now = Date.now();
  for (const p of PORTFOLIO) {
    const row = db.one('SELECT * FROM projects WHERE organization_id = ? AND name = ?', [orgId, p.name]);
    if (!row) {
      db.run(`INSERT INTO projects (organization_id, name, description, audience, url, tone, color, created_at)
              VALUES (?,?,?,?,?,?,?,?)`, [orgId, p.name, p.description, p.audience, p.description ? SITE : '', '', p.color, now]);
      continue;
    }
    // Yalnızca boş alanları doldur
    db.run(`UPDATE projects SET description = CASE WHEN COALESCE(description,'') = '' THEN ? ELSE description END,
              audience = CASE WHEN COALESCE(audience,'') = '' THEN ? ELSE audience END,
              url = CASE WHEN COALESCE(url,'') = '' AND ? != '' THEN ? ELSE url END
            WHERE id = ?`, [p.description, p.audience, p.description, SITE, row.id]);
  }
}

function seedBrand(db, orgId) {
  db.run(`UPDATE organizations SET brand_url = COALESCE(NULLIF(brand_url,''), ?),
            brand_notes = COALESCE(NULLIF(brand_notes,''), ?), brand_fetched_at = COALESCE(brand_fetched_at, ?) WHERE id = ?`,
  [SITE, BRAND_NOTES, SEEDED_AT, orgId]);
}

module.exports = { seedProjects, seedBrand, PORTFOLIO, RETIRED, BRAND_NOTES, SITE };
