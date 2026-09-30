'use strict';

// SMS YETENEGI VE KARSILAMA TUTARLILIGI
//
// Asil korunan kural: asistan TUTAMAYACAGI SOZU VERMEMELI.
// SMS kapaliyken "SMS gonderebilirim" demek, hasta "gonderin" dediginde
// gonderememek demektir - bu da aydinlatma yukumlulugunu karsilamaz.

const test = require('node:test');
const assert = require('node:assert');
const { karsilamaKur } = require('../src/klinik');

const K = {
  karsilama: {
    parcalar: {
      selam: 'Hos geldiniz.',
      kimlik: 'Ben yapay zeka asistaniyim.',
      kapsam_mesai_ici: 'Randevu olusturabilirim.',
      kapsam_mesai_disi: 'Mesai disindayiz.',
      secenek: '',
      davet: 'Nasil yardimci olabilirim?',
    },
  },
  kvkk: {
    konum: 'ortada',
    sozlu_bilgilendirme: 'Gorusme yazili kaydediliyor.',
    sms_teklifi: 'Detayli metni SMS ile gonderebilirim.',
  },
};

test('SMS KAPALIYKEN karsilama SMS teklif ETMEZ', () => {
  const m = karsilamaKur(K, false, false);
  assert.ok(!m.includes('SMS'), `kapaliyken SMS teklif edilmis: ${m}`);
  // Bilgilendirmenin kendisi yine de yapiliyor.
  assert.ok(m.includes('Gorusme yazili kaydediliyor.'), m);
});

test('SMS ACIKKEN karsilama SMS teklif EDER', () => {
  const m = karsilamaKur(K, false, true);
  assert.ok(m.includes('SMS ile gonderebilirim'), m);
});

test('smsAktif varsayilani kapali - unutulursa soz verilmemis olur', () => {
  // Guvenli taraf: parametre gecilmezse teklif YOK.
  assert.ok(!karsilamaKur(K, false).includes('SMS'));
});

test('SMS teklifi bilgilendirme cumlesine bitisik gider, davetten once', () => {
  const m = karsilamaKur(K, false, true);
  assert.ok(m.indexOf('SMS') < m.indexOf('Nasil yardimci'), m);
});

test('demo klinigi: SMS teklifi ve bilgilendirme AYRI alanlarda', () => {
  // Tek alanda olsaydi, kapatilinca bilgilendirme de kaybolurdu.
  const demo = require('../config/klinik.demo.json');
  assert.ok(demo.kvkk.sozlu_bilgilendirme, 'sozlu_bilgilendirme yok');
  assert.ok(demo.kvkk.sms_teklifi, 'sms_teklifi yok');
  assert.ok(
    !demo.kvkk.sozlu_bilgilendirme.includes('SMS'),
    'SMS teklifi bilgilendirme cumlesine gomulu kalmis'
  );
});

test('demo klinigi: gonderilecek SMS metni tanimli', () => {
  const demo = require('../config/klinik.demo.json');
  assert.ok(demo.kvkk.aydinlatma_sms_metni, 'aydinlatma_sms_metni yok');
});

test('ajan SMS kapaliyken araci modele VERMIYOR', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const kaynak = fs.readFileSync(path.join(__dirname, '..', 'src', 'ajan.js'), 'utf8');
  assert.match(
    kaynak,
    /TANIMLAR\.filter\(\(t\) => t\.name !== 'aydinlatma_metni_gonder' \|\| sms\.aktifMi\(\)\)/,
    'arac listesi yetenege gore suzulmuyor'
  );
});

test('sms modulu yapilandirma eksikken kapali sayilir', () => {
  // Modulu izole ortamda yukluyoruz: demo modu da kapali, Twilio bilgisi de yok.
  const yol = require.resolve('../src/sms');
  const configYol = require.resolve('../src/config');
  const eskiSms = require.cache[yol];
  const eskiConfig = require.cache[configYol];
  delete require.cache[yol];
  delete require.cache[configYol];

  const eskiEnv = { ...process.env };
  process.env.DEMO_MOD = 'false';
  process.env.GENEL_ADRES = 'https://ornek.test';
  process.env.DATABASE_URL = 'postgres://x/y';
  process.env.TWILIO_AUTH_TOKEN = 'x';
  process.env.PANEL_PAROLA_HASH = 'x';
  process.env.KIRACI_ID = '00000000-0000-4000-8000-000000000001';
  process.env.TOKEN_TUZU = 'x';
  process.env.KLINIK_CONFIG = 'config/klinik.demo.json';
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.SMS_GONDEREN_NO;

  try {
    const sms = require('../src/sms');
    assert.strictEqual(sms.aktifMi(), false, 'yapilandirma yokken acik gorunuyor');
    assert.strictEqual(sms.gercekGonderim(), false);
  } finally {
    process.env = eskiEnv;
    delete require.cache[yol];
    delete require.cache[configYol];
    if (eskiSms) require.cache[yol] = eskiSms;
    if (eskiConfig) require.cache[configYol] = eskiConfig;
  }
});
