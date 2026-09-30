'use strict';

// Asistanin kullanabilecegi araclar.
//
// Kural: asistan BILGIYI BURADAN ALIR, kendi uretmez. Ozellikle fiyat.
// Her aracin ciktisi denetim kaydina yazilir.

const { fiyatBandi, tarihNormalize } = require('./klinik');
const db = require('./db');
const sms = require('./sms');

const TANIMLAR = [
  {
    name: 'fiyat_bandi_sorgula',
    description:
      'Bir tedavi/islem icin klinigin ONAYLADIGI fiyat bandini getirir. ' +
      'Hasta ucret sordugunda MUTLAKA once bu araci cagir. ' +
      'Arac "onayli: false" veya "bulundu: false" donerse fiyat SOYLEME, muayeneye yonlendir. ' +
      'Kendi bildigin veya tahmin ettigin bir rakami asla soyleme.',
    input_schema: {
      type: 'object',
      properties: {
        islem: {
          type: 'string',
          description: 'Hastanin sordugu tedavi adi. Ornek: implant, zirkonyum kaplama, dolgu.',
        },
      },
      required: ['islem'],
      additionalProperties: false,
    },
  },
  {
    name: 'randevu_talebi_olustur',
    description:
      'Hastanin randevu talebini kaydeder. Sadece hasta adini, telefonunu ve tercih ettigi ' +
      'zamani TEYIT ETTIKTEN sonra cagir. Kaydedilen talep sabah klinik ekibinin onayina duser; ' +
      'bu yuzden hastaya "randevunuz kesinlesti" DEME, "talebinizi aldim, ekibimiz teyit edecek" de.',
    input_schema: {
      type: 'object',
      properties: {
        hasta_adi: { type: 'string', description: 'Hastanin adi ve soyadi.' },
        telefon: {
          type: 'string',
          description: 'Geri donus numarasi. Hasta baska numara vermediyse aradigi numara.',
        },
        islem: { type: 'string', description: 'Talep edilen islem. Bilinmiyorsa "muayene".' },
        tercih_tarih: {
          type: 'string',
          description: 'YYYY-AA-GG formatinda tercih edilen tarih. Belirsizse bos birak.',
        },
        tercih_saat: {
          type: 'string',
          description: 'Tercih edilen saat veya aralik. Ornek: "14:00", "sabah".',
        },
        not: { type: 'string', description: 'Ekibin bilmesi gereken kisa not.' },
      },
      required: ['hasta_adi', 'telefon'],
      additionalProperties: false,
    },
  },
  {
    name: 'aydinlatma_metni_gonder',
    description:
      'KVKK aydinlatma metnini hastaya SMS ile gonderir. Hasta metni istediginde ' +
      'cagir. Metnin icerigi kliniktarafindan onaylanmistir; sen metin YAZMAZSIN. ' +
      'Bu aracin listede olmasi SMS ozelliginin acik oldugu anlamina gelir.',
    input_schema: {
      type: 'object',
      properties: {
        telefon: {
          type: 'string',
          description: 'Gonderilecek numara. Hasta baska numara vermediyse aradigi numara.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'insana_aktar',
    description:
      'Gorusmeyi bir insana aktarir. Su durumlarda cagir: hasta yetkiliyle konusmak istedi, ' +
      'sikayet var, cevabini bilmedigin ve bilgi bankasinda olmayan bir konu israrla soruluyor, ' +
      'veya hastanin durumu senin yetkinin disinda. Aktarmadan once hastaya kisaca haber ver.',
    input_schema: {
      type: 'object',
      properties: {
        sebep: { type: 'string', description: 'Aktarim sebebi - ekip bunu gorecek.' },
      },
      required: ['sebep'],
      additionalProperties: false,
    },
  },
];

/**
 * Arac calistirici.
 * @param {object} baglam { klinik, aramaId, arayanNo, callSid, numaralar }
 */
function calistirici(baglam) {
  return async function calistir(ad, girdi) {
    switch (ad) {
      case 'fiyat_bandi_sorgula':
        return fiyatAraci(baglam, girdi);
      case 'randevu_talebi_olustur':
        return randevuAraci(baglam, girdi);
      case 'aydinlatma_metni_gonder':
        return aydinlatmaAraci(baglam, girdi);
      case 'insana_aktar':
        return aktarimAraci(baglam, girdi);
      default:
        return { hata: `Bilinmeyen arac: ${ad}` };
    }
  };
}

/**
 * Aydinlatma metnini SMS ile yollar.
 * Asistan metin YAZMAZ; metin klinik dosyasindan gelir.
 */
async function aydinlatmaAraci(baglam, { telefon } = {}) {
  const hedef = telefon || baglam.arayanNo;
  const sonuc = await sms.aydinlatmaGonder(hedef);

  await db.denetim({
    aktor: 'asistan',
    eylem: 'aydinlatma_sms',
    kaynak: 'arama',
    kaynakId: baglam.aramaId,
    // Numara maskeleme suzgecinden gececek (bkz. db.js).
    detay: { hedef, demo: sonuc.demo, sebep: sonuc.sebep ?? null },
    sonuc: sonuc.gonderildi ? 'gonderildi' : 'gonderilemedi',
  });

  if (sonuc.gonderildi && sonuc.demo) {
    return {
      durum: 'demo',
      aciklama:
        'DEMO: gercek SMS gonderilmedi. Hastaya "gonderildi" DEME; ' +
        'bunun bir demo oldugunu belirt veya konuyu ekibe birak.',
    };
  }
  if (sonuc.gonderildi) {
    return { durum: 'gonderildi', aciklama: 'Aydinlatma metni SMS ile gonderildi.' };
  }
  return {
    durum: 'gonderilemedi',
    sebep: sonuc.sebep,
    aciklama:
      'SMS gonderilemedi. Hastaya gonderildi DEME. Metni klinik ekibinin ' +
      'iletecegini soyle ve gerekirse insana aktar.',
  };
}

async function fiyatAraci(baglam, { islem }) {
  const sonuc = fiyatBandi(baglam.klinik, islem);

  await db.denetim({
    aktor: 'asistan',
    eylem: 'fiyat_sorgu',
    kaynak: 'arama',
    kaynakId: baglam.aramaId,
    detay: { islem, sonuc },
    sonuc: sonuc.onayli ? 'band_verildi' : 'band_yok',
  });

  if (!sonuc.bulundu) {
    return {
      bulundu: false,
      onayli: false,
      talimat:
        'Bu islem fiyat listesinde yok. Rakam SOYLEME. Muayeneye yonlendir ve ' +
        'gerekirse ekibin donus yapacagini soyle.',
    };
  }
  if (!sonuc.onayli) {
    return {
      bulundu: true,
      onayli: false,
      islem: sonuc.islem,
      talimat:
        'Bu islemin fiyati henuz onaylanmadi. Rakam SOYLEME. ' +
        baglam.klinik.fiyat_politikasi.onaysiz_yanit,
    };
  }
  return {
    bulundu: true,
    onayli: true,
    islem: sonuc.islem,
    alt: sonuc.alt,
    ust: sonuc.ust,
    birim: sonuc.birim,
    aciklama: sonuc.aciklama,
    talimat:
      'Bu bandi soyleyebilirsin. Bandin ALT ve UST degerini oldugu gibi kullan, ' +
      'arasinda tek bir rakam uydurma. Neden degistigini kisaca acikla ve muayeneye yonlendir.',
  };
}

async function randevuAraci(baglam, girdi) {
  const telefon = (girdi.telefon || baglam.arayanNo || '').trim();
  if (!girdi.hasta_adi?.trim() || !telefon) {
    return { kaydedildi: false, talimat: 'Ad veya telefon eksik. Hastadan tekrar iste.' };
  }

  const tercihTarih = tarihNormalize(girdi.tercih_tarih);

  const kayit = await db.randevuTalebiEkle({
    aramaId: baglam.aramaId,
    hastaAdi: girdi.hasta_adi.trim(),
    telefon,
    islem: girdi.islem?.trim() || 'muayene',
    tercihTarih,
    tercihSaat: girdi.tercih_saat?.trim() || null,
    not: girdi.not?.trim() || null,
  });

  await db.denetim({
    aktor: 'asistan',
    eylem: 'randevu_talebi_olustur',
    kaynak: 'randevu_talebi',
    kaynakId: kayit.id,
    detay: { girdi, aramaId: baglam.aramaId },
    sonuc: 'beklemede',
  });

  return {
    kaydedildi: true,
    talep_no: kayit.id.slice(0, 8),
    talimat:
      'Talep kuyruga alindi. Hastaya "talebinizi aldim, ekibimiz mesai basinda teyit edip ' +
      'sizi arayacak" anlaminda bir cumle kur. "Randevunuz kesinlesti" DEME.',
  };
}

async function aktarimAraci(baglam, { sebep }) {
  const hedef = baglam.numaralar.resepsiyon || baglam.numaralar.nobetci;

  await db.denetim({
    aktor: 'asistan',
    eylem: 'insana_aktar',
    kaynak: 'arama',
    kaynakId: baglam.aramaId,
    detay: { sebep, hedef: hedef ? 'var' : 'yok' },
    sonuc: hedef ? 'aktariliyor' : 'numara_yok',
  });

  if (!hedef) {
    return {
      aktarildi: false,
      talimat:
        'Su anda aktarilacak bir numara tanimli degil. Hastadan ozur dile, ' +
        'iletisim bilgisini al ve ekibin en kisa surede donecegini soyle.',
    };
  }

  await db.aktarimNiyetiYaz(baglam.callSid, hedef, sebep);

  return {
    aktarildi: true,
    _aktarim: { hedef, sebep }, // relay katmani bunu gorup oturumu kapatir
    talimat: 'Hastaya bir saniye beklemesini soyle ve baska bir sey ekleme.',
  };
}

module.exports = { TANIMLAR, calistirici };
