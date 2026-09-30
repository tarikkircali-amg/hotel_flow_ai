'use strict';

const { Pool } = require('pg');
const crypto = require('node:crypto');
const config = require('./config');

const havuz = new Pool({ connectionString: config.db.url, ssl: config.db.ssl, max: 10 });

havuz.on('error', (err) => {
  console.error('[db] bosta duran baglantida hata:', err.message);
});

const sorgu = (metin, degerler) => havuz.query(metin, degerler);

// --- Denetim -------------------------------------------------------------
// Her AI eylemi, her veri degisikligi, her panel islemi buraya yazilir.
async function denetim({ aktor, eylem, kaynak, kaynakId, detay, ip, sonuc }) {
  try {
    await sorgu(
      `INSERT INTO denetim (aktor, eylem, kaynak, kaynak_id, detay, ip, sonuc)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [aktor, eylem, kaynak ?? null, kaynakId ?? null, detay ?? null, ip ?? null, sonuc ?? null]
    );
  } catch (err) {
    // Denetim yazimi cagriyi dusurmemeli, ama sessiz de kalmamali.
    console.error('[denetim] yazilamadi:', err.message);
  }
}

// --- Aramalar ------------------------------------------------------------
async function aramaBaslat({ callSid, sessionId, kanal, arayanNo, arananNo, dil, mesaiDisi }) {
  const { rows } = await sorgu(
    `INSERT INTO aramalar (call_sid, session_id, kanal, arayan_no, aranan_no, dil, mesai_disi)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (call_sid) DO UPDATE SET session_id = EXCLUDED.session_id
     RETURNING *`,
    [callSid, sessionId ?? null, kanal ?? 'telefon', arayanNo ?? null, arananNo ?? null, dil ?? null, mesaiDisi]
  );
  return rows[0];
}

async function aramaBitir(aramaId, { durum, aktarimSebebi, ozet }) {
  await sorgu(
    `UPDATE aramalar
        SET durum = $2, aktarim_sebebi = COALESCE($3, aktarim_sebebi),
            ozet = COALESCE($4, ozet), bitis = now()
      WHERE id = $1`,
    [aramaId, durum, aktarimSebebi ?? null, ozet ?? null]
  );
}

async function mesajEkle(aramaId, yon, metin) {
  if (!metin || !String(metin).trim()) return;
  await sorgu(`INSERT INTO mesajlar (arama_id, yon, metin) VALUES ($1,$2,$3)`, [
    aramaId,
    yon,
    String(metin).trim(),
  ]);
}

async function gecmisGorusmeler(arayanNo, hariçAramaId, limit = 3) {
  if (!arayanNo) return [];
  const { rows } = await sorgu(
    `SELECT id, baslangic, ozet
       FROM aramalar
      WHERE arayan_no = $1 AND id <> $2 AND ozet IS NOT NULL
      ORDER BY baslangic DESC
      LIMIT $3`,
    [arayanNo, hariçAramaId, limit]
  );
  return rows;
}

// --- Randevu talepleri ---------------------------------------------------
async function randevuTalebiEkle(talep) {
  const { rows } = await sorgu(
    `INSERT INTO randevu_talepleri
       (arama_id, hasta_adi, telefon, islem, tercih_tarih, tercih_saat, not_metni, yeni_hasta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      talep.aramaId ?? null,
      talep.hastaAdi,
      talep.telefon,
      talep.islem ?? null,
      talep.tercihTarih ?? null,
      talep.tercihSaat ?? null,
      talep.not ?? null,
      talep.yeniHasta ?? null,
    ]
  );
  return rows[0];
}

async function randevuKuyrugu({ durum = 'beklemede', limit = 100 } = {}) {
  const { rows } = await sorgu(
    `SELECT r.*, a.arayan_no, a.baslangic AS arama_baslangic
       FROM randevu_talepleri r
       LEFT JOIN aramalar a ON a.id = r.arama_id
      WHERE r.durum = $1
      ORDER BY r.olusturma DESC
      LIMIT $2`,
    [durum, limit]
  );
  return rows;
}

async function randevuKarar(id, { durum, onaylayan }) {
  const { rows } = await sorgu(
    `UPDATE randevu_talepleri
        SET durum = $2, onaylayan = $3, onay_zamani = now()
      WHERE id = $1 AND durum = 'beklemede'
      RETURNING *`,
    [id, durum, onaylayan]
  );
  return rows[0] ?? null;
}

// --- Acil ----------------------------------------------------------------
async function acilKaydet({ aramaId, arayanNo, tetikleyen, hastaSozu, yonlendirme }) {
  const { rows } = await sorgu(
    `INSERT INTO acil_olaylar (arama_id, arayan_no, tetikleyen, hasta_sozu, yonlendirme)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [aramaId ?? null, arayanNo ?? null, tetikleyen, hastaSozu, yonlendirme ?? null]
  );
  return rows[0];
}

async function acilKuyrugu(limit = 50) {
  const { rows } = await sorgu(
    `SELECT * FROM acil_olaylar WHERE goruldu = FALSE ORDER BY olusturma DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

async function acilGoruldu(id) {
  await sorgu(`UPDATE acil_olaylar SET goruldu = TRUE WHERE id = $1`, [id]);
}

// --- Riza ----------------------------------------------------------------
async function rizaKaydet({ aramaId, telefon, kanal, metinVersiyonu }) {
  await sorgu(
    `INSERT INTO rizalar (arama_id, telefon, kanal, metin_versiyonu) VALUES ($1,$2,$3,$4)`,
    [aramaId ?? null, telefon ?? null, kanal, metinVersiyonu]
  );
}

// --- Aktarim niyeti ------------------------------------------------------
// ConversationRelay kapanirken action webhook'u bunu okuyup <Dial> uretir.
async function aktarimNiyetiYaz(callSid, hedefNo, sebep) {
  await sorgu(
    `INSERT INTO aktarim_niyetleri (call_sid, hedef_no, sebep)
     VALUES ($1,$2,$3)
     ON CONFLICT (call_sid) DO UPDATE SET hedef_no = EXCLUDED.hedef_no, sebep = EXCLUDED.sebep`,
    [callSid, hedefNo, sebep ?? null]
  );
}

async function aktarimNiyetiOku(callSid) {
  const { rows } = await sorgu(`DELETE FROM aktarim_niyetleri WHERE call_sid = $1 RETURNING *`, [
    callSid,
  ]);
  return rows[0] ?? null;
}

// --- Panel oturumu -------------------------------------------------------
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function oturumAc(kullanici, ip) {
  const token = crypto.randomBytes(32).toString('base64url');
  const gecerlilik = new Date(Date.now() + config.panel.oturumSaat * 3600_000);
  await sorgu(
    `INSERT INTO oturumlar (token_hash, kullanici, ip, gecerlilik) VALUES ($1,$2,$3,$4)`,
    [tokenHash(token), kullanici, ip ?? null, gecerlilik]
  );
  return { token, gecerlilik };
}

async function oturumDogrula(token) {
  if (!token) return null;
  const { rows } = await sorgu(
    `SELECT kullanici FROM oturumlar WHERE token_hash = $1 AND gecerlilik > now()`,
    [tokenHash(token)]
  );
  return rows[0]?.kullanici ?? null;
}

async function oturumKapat(token) {
  if (!token) return;
  await sorgu(`DELETE FROM oturumlar WHERE token_hash = $1`, [tokenHash(token)]);
}

async function suresiGecenOturumlariSil() {
  await sorgu(`DELETE FROM oturumlar WHERE gecerlilik < now()`);
  await sorgu(`DELETE FROM aktarim_niyetleri WHERE olusturma < now() - INTERVAL '1 hour'`);
}

module.exports = {
  havuz,
  sorgu,
  denetim,
  aramaBaslat,
  aramaBitir,
  mesajEkle,
  gecmisGorusmeler,
  randevuTalebiEkle,
  randevuKuyrugu,
  randevuKarar,
  acilKaydet,
  acilKuyrugu,
  acilGoruldu,
  rizaKaydet,
  aktarimNiyetiYaz,
  aktarimNiyetiOku,
  oturumAc,
  oturumDogrula,
  oturumKapat,
  suresiGecenOturumlariSil,
};
