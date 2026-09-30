'use strict';

// SMS GONDERIMI
//
// Tek isi var: KVKK aydinlatma metninin baglantisini hastaya SMS ile
// yollamak. Serbest metin gondermiyoruz - asistanin uydurdugu bir metnin
// klinik adina SMS olarak gitmesi kabul edilemez. Gonderilecek metin
// klinik dosyasindan gelir.
//
// Uc durum var ve ucu de acikca ayirt ediliyor:
//   * yapilandirilmamis -> gonderilmez, asistan SMS teklif ETMEZ
//   * demo modu         -> gercek SMS gitmez, niyet kaydedilir
//   * uretim            -> Twilio uzerinden gercekten gonderilir

const config = require('./config');

/** Twilio bilgileri tam mi? Eksikse SMS ozelligi kapali sayilir. */
function aktifMi() {
  const s = config.sms;
  return Boolean(s.hesapSid && s.authToken && s.gonderenNo) || config.demoMod;
}

/** Gercekten SMS gonderiliyor mu, yoksa sadece kaydediliyor mu? */
function gercekGonderim() {
  const s = config.sms;
  return Boolean(s.hesapSid && s.authToken && s.gonderenNo);
}

/**
 * Aydinlatma metnini gonderir.
 * @returns {Promise<{gonderildi: boolean, demo: boolean, sebep?: string}>}
 */
async function aydinlatmaGonder(telefon) {
  if (!aktifMi()) {
    return { gonderildi: false, demo: false, sebep: 'sms_yapilandirilmamis' };
  }
  if (!telefon) {
    return { gonderildi: false, demo: false, sebep: 'numara_yok' };
  }

  const metin = config.klinik.kvkk?.aydinlatma_sms_metni;
  if (!metin) {
    // Metin yoksa uydurmuyoruz.
    return { gonderildi: false, demo: false, sebep: 'metin_tanimli_degil' };
  }

  if (!gercekGonderim()) {
    // Demo: gercek SMS gitmez. "Gonderdim" demiyoruz, demo oldugunu soyluyoruz.
    return { gonderildi: true, demo: true };
  }

  const s = config.sms;
  const govde = new URLSearchParams({ To: telefon, From: s.gonderenNo, Body: metin });

  try {
    const yanit = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(s.hesapSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${s.hesapSid}:${s.authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: govde,
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (yanit.ok) return { gonderildi: true, demo: false };

    // Saglayicinin hata metnini loga yaziyoruz ama hastaya yansitmiyoruz.
    const hata = await yanit.text();
    console.error(`[sms] gonderilemedi (HTTP ${yanit.status}): ${hata.slice(0, 200)}`);
    return { gonderildi: false, demo: false, sebep: `http_${yanit.status}` };
  } catch (err) {
    console.error('[sms] gonderilemedi:', err.message);
    return { gonderildi: false, demo: false, sebep: 'baglanti_hatasi' };
  }
}

module.exports = { aktifMi, gercekGonderim, aydinlatmaGonder };
