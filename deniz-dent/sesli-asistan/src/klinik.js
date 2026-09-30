'use strict';

// Klinik bilgisi uzerinde calisan saf fonksiyonlar.
// Bilerek config'e bagimli degil - parametre olarak klinik nesnesi alirlar,
// boylece test edilebilirler.

const GUN_ADI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/**
 * Verilen anin klinigin zaman diliminde hangi gun/dakika oldugunu bulur.
 * Sunucu UTC'de calissa bile dogru sonuc verir.
 */
function yerelAn(tarih, zamanDilimi) {
  const bicim = new Intl.DateTimeFormat('en-US', {
    timeZone: zamanDilimi,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  });
  const parcalar = Object.fromEntries(
    bicim.formatToParts(tarih).map((p) => [p.type, p.value])
  );
  const gunIndeksi = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parcalar.weekday];
  // Intl bazi ortamlarda gece yarisini "24" olarak verir.
  const saat = parcalar.hour === '24' ? 0 : Number(parcalar.hour);
  return {
    gun: gunIndeksi,
    dakika: saat * 60 + Number(parcalar.minute),
    isoTarih: `${parcalar.year}-${parcalar.month}-${parcalar.day}`,
  };
}

function saatiDakikaya(hhmm) {
  const [s, d] = String(hhmm).split(':').map(Number);
  return s * 60 + d;
}

/**
 * Klinik su anda acik mi?
 * Kapali gunler her zaman kazanir.
 */
function mesaiIcinde(klinik, tarih = new Date()) {
  const tz = klinik.klinik?.zaman_dilimi || 'Europe/Istanbul';
  const an = yerelAn(tarih, tz);

  if ((klinik.mesai?.kapali_gunler ?? []).includes(an.isoTarih)) return false;

  const bugun = (klinik.mesai?.haftalik ?? []).filter((g) => g.gun === an.gun);
  if (bugun.length === 0) return false;

  return bugun.some(
    (g) => an.dakika >= saatiDakikaya(g.acilis) && an.dakika < saatiDakikaya(g.kapanis)
  );
}

/**
 * Asistanin "yarin saat kacta aciyoruz" diyebilmesi icin bir sonraki acilis.
 * En fazla 14 gun ileri bakar; hicbir sey bulamazsa null doner.
 */
function sonrakiAcilis(klinik, tarih = new Date()) {
  const tz = klinik.klinik?.zaman_dilimi || 'Europe/Istanbul';
  const kapali = new Set(klinik.mesai?.kapali_gunler ?? []);
  const haftalik = klinik.mesai?.haftalik ?? [];

  for (let ileri = 0; ileri < 14; ileri += 1) {
    const aday = new Date(tarih.getTime() + ileri * 86400000);
    const an = yerelAn(aday, tz);
    if (kapali.has(an.isoTarih)) continue;

    const gunler = haftalik
      .filter((g) => g.gun === an.gun)
      .sort((a, b) => saatiDakikaya(a.acilis) - saatiDakikaya(b.acilis));

    for (const g of gunler) {
      if (ileri > 0 || an.dakika < saatiDakikaya(g.acilis)) {
        return { gunAdi: GUN_ADI[an.gun], tarih: an.isoTarih, saat: g.acilis, gunSonra: ileri };
      }
    }
  }
  return null;
}

/**
 * Onayli fiyat bandini dondurur.
 * ONEMLI: onayli olmayan hicbir fiyat disari cikmaz. Bulunamayan islem de
 * "yok" doner - asistan bu durumda muayeneye yonlendirmek zorundadir.
 */
function fiyatBandi(klinik, islemAdi) {
  const aranan = normalize(islemAdi);
  const liste = klinik.fiyatlar ?? [];

  const tam = liste.find((f) => normalize(f.islem) === aranan);
  const kismi =
    tam ??
    liste.find((f) => {
      const ad = normalize(f.islem);
      return ad.includes(aranan) || aranan.includes(ad);
    });

  if (!kismi) return { bulundu: false, onayli: false };
  if (!kismi.onayli || kismi.alt == null || kismi.ust == null) {
    return { bulundu: true, onayli: false, islem: kismi.islem, aciklama: kismi.aciklama ?? null };
  }
  return {
    bulundu: true,
    onayli: true,
    islem: kismi.islem,
    alt: Number(kismi.alt),
    ust: Number(kismi.ust),
    birim: kismi.birim ?? 'TL',
    aciklama: kismi.aciklama ?? null,
  };
}

/** Turkce karakterleri ve buyuk/kucuk farkini yok sayan karsilastirma anahtari. */
function normalize(metin) {
  return String(metin ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mesaiMetni(klinik) {
  const gunler = (klinik.mesai?.haftalik ?? [])
    .slice()
    .sort((a, b) => a.gun - b.gun)
    .map((g) => `${GUN_ADI[g.gun]} ${g.acilis}-${g.kapanis}`);
  return gunler.join(', ') || 'belirtilmemiş';
}

/**
 * Sadece YYYY-AA-GG kabul eder. "yarin" gibi ifadeleri modele birakmiyoruz -
 * belirsiz tarih null doner ve asistan hastadan netlestirmesini ister.
 */
function tarihNormalize(ham) {
  if (!ham) return null;
  const m = String(ham).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, yil, ay, gun] = m.map(Number);
  if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return null;
  const tarih = new Date(Date.UTC(yil, ay - 1, gun));
  if (tarih.getUTCMonth() !== ay - 1 || tarih.getUTCDate() !== gun) return null;
  return m[0];
}

module.exports = {
  mesaiIcinde,
  tarihNormalize,
  sonrakiAcilis,
  fiyatBandi,
  mesaiMetni,
  normalize,
  yerelAn,
  GUN_ADI,
};
