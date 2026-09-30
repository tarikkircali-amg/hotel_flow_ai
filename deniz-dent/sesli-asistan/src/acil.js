'use strict';

// ACIL TARAMA
//
// Bu modul, hastanin sozu LLM'e GITMEDEN ONCE calisir.
//
// Gerekce: acil bir cagrida modelin "dusunmesini" bekleyemeyiz ve modelin
// dogru davranacagina guvenemeyiz. Kanama, travma veya siddetli agri
// ifadelerinde asistan bilgi vermeye calismamali, triyaj yapmamali;
// dogrudan yonlendirmeli. Bu, teknik degil klinik sorumluluk gerekcesidir.
//
// Yanlis pozitif (acil olmayana acil demek) kabul edilebilir bir maliyettir.
// Yanlis negatif degildir.

const { normalize } = require('./klinik');

/**
 * @param {object} klinik  klinik.json icerigi
 * @param {string} soz     hastanin soyledigi (STT ciktisi)
 * @returns {{acil: boolean, tetikleyen: string|null}}
 */
function acilMi(klinik, soz) {
  const metin = normalize(soz);
  if (!metin) return { acil: false, tetikleyen: null };

  for (const ham of klinik.acil?.anahtar_kelimeler ?? []) {
    const kelime = normalize(ham);
    if (!kelime) continue;
    if (kelimeGecer(metin, kelime)) {
      return { acil: true, tetikleyen: ham };
    }
  }
  return { acil: false, tetikleyen: null };
}

/**
 * Kelime siniri kontrolu.
 * "kanama" -> "kanama var" eslesir; "kan" -> "kanepe" eslesmez.
 * Cok kelimeli ifadeler ("kan durmuyor") oldugu gibi aranir.
 */
function kelimeGecer(metin, kelime) {
  if (kelime.includes(' ')) return metin.includes(kelime);
  return new RegExp(`(^|\\s)${kacir(kelime)}\\w*(\\s|$)`).test(metin);
}

function kacir(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Acil durumda hastaya soylenecek cumle ve yapilacak eylem.
 * Aktarilacak numara yoksa sozlu yonlendirmeye duser - sessiz kalmaz.
 */
function acilYanit(klinik, hedefNumara) {
  if (hedefNumara) {
    return {
      metin: klinik.acil.yanit,
      aktar: true,
      hedef: hedefNumara,
    };
  }
  return {
    metin: klinik.acil.yanit_aktarim_yoksa ?? klinik.acil.yanit,
    aktar: false,
    hedef: null,
  };
}

module.exports = { acilMi, acilYanit };
