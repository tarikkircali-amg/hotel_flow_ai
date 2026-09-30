'use strict';

// TANITIM / REKLAM KORUMASI
//
// Spesifikasyon §15. Saglik hizmeti tanitiminda mevzuat "en iyi", "%100
// basari", "garantili" gibi ifadeleri yasakliyor. Model bunlari kendiliginden
// uretebilir - ozellikle hasta israr ederse ("garanti veriyor musunuz?").
//
// Bu modul DENETLER, uretimi engellemez. Sebebi durustce yaziyorum:
// yanit akis halinde (streaming) hastaya gidiyor; bir ifadeyi soylenmeden
// once kesmek, ilk ses gecikmesini artiran ayri bir refactor. Bugun:
//   1. Sistem metnindeki kural ureten tarafi engelliyor (onleme)
//   2. Bu modul ureteni yakalayip denetime yaziyor (tespit)
// Konusma oncesi tam engelleme ayri bir is olarak planlandi.
//
// Liste klinik dosyasindan genisletilebilir - kod icinde mevzuat tasimiyoruz.

const { normalize } = require('./klinik');

/** Mevzuatin acikca sakindirdigi kaliplar. Klinik dosyasi bunu genisletebilir. */
const VARSAYILAN_YASAKLI = [
  'en iyi',
  'en basarili',
  'turkiye nin en',
  'yuzde yuz',
  '%100',
  '100 basari',
  'garantili',
  'garanti ediyoruz',
  'kesin sonuc',
  'kesinlikle gecer',
  'agrisiz garantisi',
  'omur boyu garanti',
  'rakiplerimizden iyi',
  'digerlerinden iyi',
];

/**
 * Asistanin urettigi metni denetler.
 * @returns {{temiz: boolean, ihlaller: string[]}}
 */
function denetle(klinik, metin) {
  if (typeof metin !== 'string' || !metin.trim()) return { temiz: true, ihlaller: [] };

  const hedef = normalize(metin);
  const liste = [...VARSAYILAN_YASAKLI, ...(klinik?.tanitim?.yasakli_ifadeler ?? [])];

  const ihlaller = [];
  for (const ham of liste) {
    const ifade = normalize(ham);
    if (ifade && hedef.includes(ifade)) ihlaller.push(ham);
  }

  return { temiz: ihlaller.length === 0, ihlaller: [...new Set(ihlaller)] };
}

module.exports = { denetle, VARSAYILAN_YASAKLI };
