'use strict';

// ZORUNLU INSANA AKTARIM TARAMASI - spesifikasyon §21
//
// Acil taramasi gibi, bu da LLM'DEN ONCE calisir ve LLM'in yorumuna
// birakilmaz. Sebep: bu durumlarda modelin "iyi cevap vermeye calismasi"
// tam olarak istemedigimiz sey.
//
//   * Hasta sikayet ediyorsa    -> model savunmaya gecmemeli
//   * Hukuki talep varsa        -> model hicbir sey taahhut etmemeli
//   * KVKK talebi varsa         -> model "sildim" dememeli, silemez
//
// Bunlarin hicbirinde asistanin "yardimci olmaya calismasi" dogru degil.
// Klinik ekibi konusmali.
//
// Acil taramasindan AYRI tutuldu: acil tibbi bir durumdur ve farkli metin,
// farkli hedef numara, farkli kayit gerektirir. Ayni listeye koymak ikisini
// de bulanik hale getirirdi.

const { normalize } = require('./klinik');

/** Klinik dosyasi bunlari genisletebilir; kod icinde sabit liste tasimiyoruz. */
const VARSAYILAN = [
  { sebep: 'sikayet', ipuclari: ['sikayet', 'sikayetci', 'memnun degilim', 'rezalet', 'yanlis tedavi'] },
  { sebep: 'hukuki', ipuclari: ['avukat', 'dava', 'savcilik', 'mahkeme', 'tazminat', 'tuketici hakem'] },
  { sebep: 'kvkk', ipuclari: ['kvkk', 'verilerimi sil', 'kisisel verilerim', 'aydinlatma metni', 'veri sorumlusu'] },
  { sebep: 'malpraktis', ipuclari: ['malpraktis', 'hatali islem', 'yanlis dis'] },
];

/**
 * @returns {{aktar: boolean, sebep: string|null, tetikleyen: string|null}}
 */
function aktarimGerekli(klinik, soz) {
  const metin = normalize(soz);
  if (!metin) return { aktar: false, sebep: null, tetikleyen: null };

  const liste = [...VARSAYILAN, ...(klinik?.insana_aktar?.tetikleyiciler ?? [])];

  for (const grup of liste) {
    for (const ham of grup.ipuclari ?? []) {
      const ipucu = normalize(ham);
      if (ipucu && metin.includes(ipucu)) {
        return { aktar: true, sebep: grup.sebep, tetikleyen: ham };
      }
    }
  }
  return { aktar: false, sebep: null, tetikleyen: null };
}

/** Hastaya soylenecek metin. Klinik yazmadiysa notr bir varsayilan kullanilir. */
function aktarimMetni(klinik, sebep) {
  const ozel = klinik?.insana_aktar?.metinler?.[sebep];
  if (ozel) return ozel;

  return (
    klinik?.insana_aktar?.varsayilan_metin ??
    'Bu konuyu klinik ekibimizin degerlendirmesi gerekiyor. Sizi ekibimize aktariyorum; ' +
      'ulasilamazsa en kisa surede size donus yapilacak.'
  );
}

module.exports = { aktarimGerekli, aktarimMetni, VARSAYILAN };
