'use strict';

// SAGLIK VERISI GUVENLIK DUVARI
//
// Spesifikasyon §5. Hastanin ham cumlesi LLM'e GITMEDEN once buradan gecer.
//
// Ne yapar:
//   1. Kimlik numarasi, telefon ve e-postayi maskeler (deterministik, LLM degil)
//   2. Sikayeti klinik onayli kategoriye esler
//   3. Aciliyet seviyesi uretir
//   4. Kararli bir hasta token'i uretir
//
// Ne YAPMAZ:
//   * Ad-soyadi silmez. Sebep: randevu icin ad gerekiyor ve asistanin hastaya
//     adiyla hitap edememesi gorusmeyi bozuyor. Ad, yetkili islem katmaninda
//     (randevu araci) kaliyor; loglarda ve LLM baglaminda ise ZATEN hasta
//     tarafindan soylenmis oldugu icin ek risk yaratmiyor. Bu bilincli bir
//     kullanilabilirlik/gizlilik ayaridir - spesifikasyon §5'in tam token
//     onerisinden SAPMADIR ve klinikle konusulmalidir.
//     COMPLIANCE_REVIEW_REQUIRED
//
// FAIL-CLOSED: Bu modulun herhangi bir adimi patlarsa cagiran taraf
// gorusmeyi insana aktarmak zorundadir. Sessizce ham metinle devam etmek
// spesifikasyon §5 tarafindan acikca yasaklanmistir.

const crypto = require('node:crypto');
const { normalize } = require('./klinik');

/**
 * Maskeleme kaliplari. Sira onemli: TC kimlik telefondan once denenir.
 * TC kimlik numarasi 0 ile baslamaz, bu yuzden "0532..." ile karismaz.
 */
const KALIPLAR = [
  {
    tur: 'tckn',
    re: /\b[1-9]\d{10}\b/g,
    maske: () => 'TCKN_***',
  },
  {
    tur: 'eposta',
    re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
    maske: () => '***@***',
  },
  {
    // +90 532 111 22 33 / 0532 111 22 33 / 5321112233
    tur: 'telefon',
    re: /(?:\+90|0)?[\s.-]?\(?5\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g,
    maske: (eslesen) => `***${eslesen.replace(/\D/g, '').slice(-4)}`,
  },
];

/**
 * Metindeki kimlik bilgilerini maskeler.
 * @returns {{metin: string, bulgular: string[]}}
 */
function maskele(ham) {
  if (typeof ham !== 'string' || !ham) return { metin: '', bulgular: [] };

  const bulgular = [];
  let metin = ham;

  for (const kalip of KALIPLAR) {
    metin = metin.replace(new RegExp(kalip.re), (eslesen) => {
      bulgular.push(kalip.tur);
      return kalip.maske(eslesen);
    });
  }

  return { metin, bulgular };
}

/**
 * Sikayeti klinik onayli kategoriye esler.
 * Kategoriler klinik dosyasindan gelir - kod icinde tibbi liste TUTMUYORUZ.
 * Eslesme yoksa BELIRTILMEMIS doner; uydurma kategori uretilmez.
 */
function siniflandir(klinik, soz) {
  const metin = normalize(soz);
  if (!metin) return 'BELIRTILMEMIS';

  for (const kategori of klinik.saglik_kategorileri ?? []) {
    for (const ipucu of kategori.ipuclari ?? []) {
      const k = normalize(ipucu);
      if (k && metin.includes(k)) return kategori.kod;
    }
  }
  return 'BELIRTILMEMIS';
}

/**
 * Kararli, geri cevrilemez hasta token'i.
 * Ayni numara ayni token'i uretir; token'dan numaraya donulemez.
 * Tuz olmadan uretilmez - tuzsuz hash'te telefon numarasi kaba kuvvetle bulunur.
 */
function hastaToken(tanimlayici, tuz) {
  if (!tanimlayici) return 'PAT_ANONIM';
  if (!tuz) throw new Error('hastaToken: tuz zorunlu - tuzsuz hash geri cevrilebilir');
  const ozet = crypto.createHmac('sha256', tuz).update(String(tanimlayici)).digest('hex');
  return `PAT_${ozet.slice(0, 8)}`;
}

/**
 * Guvenlik duvarinin tam gecisi.
 *
 * @param {object} p
 * @param {object} p.klinik
 * @param {string} p.soz         hastanin ham sozu
 * @param {string} p.tanimlayici telefon numarasi vb.
 * @param {string} p.tuz         token tuzu
 * @param {boolean} p.acil       acil taramasi sonucu (acil.js'ten)
 * @returns {{llmMetni: string, kayit: object}}
 */
function gecir({ klinik, soz, tanimlayici, tuz, acil = false }) {
  const { metin, bulgular } = maskele(soz);
  const kategori = siniflandir(klinik, soz);

  let aciliyet = 'NORMAL';
  if (acil) aciliyet = 'ACIL';
  else if (kategori !== 'BELIRTILMEMIS') aciliyet = 'REVIEW_REQUIRED';

  return {
    llmMetni: metin,
    kayit: {
      patient_token: hastaToken(tanimlayici, tuz),
      complaint_category: kategori,
      urgency: aciliyet,
      raw_identity_removed: bulgular.length > 0,
      masked_types: [...new Set(bulgular)],
    },
  };
}

/**
 * DENETIM KAYDI SUZGECI - spesifikasyon §11
 *
 * "Audit log hasta konusmasinin kopyasi degildir." Ama detay alani serbest
 * JSONB; ileride biri oraya iyi niyetle hasta_sozu koyabilir ve kimse fark
 * etmez. Bu suzgec, denetim yazimini tek noktadan geciriyor.
 *
 * Uc kural:
 *   1. Adi ham metin cagristiran anahtarlar tamamen dusurulur.
 *   2. Kalan metinler maskeleme suzgecinden gecer (telefon, TC, e-posta).
 *   3. Uzun metinler kirpilir - uzun bir dize buyuk ihtimalle dokumun kendisi.
 *
 * Denylist yaklasimi bilincli: allowlist olsaydi yeni bir alan eklendiginde
 * sessizce dusulur ve denetim kaydi eksik kalirdi. Burada eksik kalmasi
 * gereken tek sey ham icerik.
 */
const DUSURULEN_ANAHTARLAR = [
  'metin', 'soz', 'hasta_sozu', 'icerik', 'transcript', 'dokum',
  'konusma', 'mesaj', 'not', 'not_metni', 'ozet', 'prompt', 'yanit',
];

const AZAMI_UZUNLUK = 200;

function denetimDetayiTemizle(detay) {
  if (detay === null || detay === undefined) return null;
  if (typeof detay !== 'object' || Array.isArray(detay)) {
    return { deger: kirp(String(detay)) };
  }

  const temiz = {};
  for (const [anahtar, deger] of Object.entries(detay)) {
    if (DUSURULEN_ANAHTARLAR.includes(anahtar.toLowerCase())) {
      temiz[anahtar] = '[dusuruldu: ham icerik denetim kaydina yazilmaz]';
      continue;
    }
    if (typeof deger === 'string') {
      temiz[anahtar] = kirp(maskele(deger).metin);
    } else if (deger && typeof deger === 'object' && !Array.isArray(deger)) {
      temiz[anahtar] = denetimDetayiTemizle(deger);
    } else {
      temiz[anahtar] = deger;
    }
  }
  return temiz;
}

function kirp(s) {
  return s.length > AZAMI_UZUNLUK ? `${s.slice(0, AZAMI_UZUNLUK)}...[kirpildi]` : s;
}

module.exports = { maskele, siniflandir, hastaToken, gecir, denetimDetayiTemizle };
