'use strict';

// Config yukleme davranisi.
//
// Buradaki ilk test gercek bir sahaya cikmis hatayi koruyor:
// .env.example icinde KLINIK_CONFIG=config/klinik.json satiri vardi ve
// demo modunun kendi dosyasini eziyordu. O dosya depoda olmadigi icin
// sunucu acilir acilmaz oluyordu, kullanici da sadece tarayicida
// "baglanti reddedildi" goruyordu.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const KOK = path.resolve(__dirname, '..');
const CONFIG_YOLU = require.resolve('../src/config');

/** Config'i temiz bir ortamla yeniden yukler. */
function configYukle(ortam) {
  const yedek = { ...process.env };
  // dotenv'in .env dosyasini okumasini engelle - testler dosyaya bagli olmasin
  for (const k of Object.keys(process.env)) {
    if (k.startsWith('ASISTAN_') || k.startsWith('ELEVENLABS_') || k === 'DEMO_MOD' || k === 'KLINIK_CONFIG') {
      delete process.env[k];
    }
  }
  Object.assign(process.env, ortam);
  delete require.cache[CONFIG_YOLU];
  try {
    return require('../src/config');
  } finally {
    delete require.cache[CONFIG_YOLU];
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, yedek);
  }
}

test('demo modunda olmayan KLINIK_CONFIG demo dosyasina duser', () => {
  const c = configYukle({
    DEMO_MOD: 'true',
    KLINIK_CONFIG: 'config/klinik.json', // depoda yok - eski .env.example bunu yaziyordu
  });
  assert.equal(c.klinikYolu, 'config/klinik.demo.json');
  assert.ok(c.klinik.klinik.ad, 'klinik bilgisi yuklenmis olmali');
});

test('demo modunda KLINIK_CONFIG verilmezse demo dosyasi secilir', () => {
  const c = configYukle({ DEMO_MOD: 'true' });
  assert.equal(c.klinikYolu, 'config/klinik.demo.json');
});

test('demo modunda Twilio, Postgres ve panel parolasi zorunlu degil', () => {
  const c = configYukle({ DEMO_MOD: 'true' });
  assert.equal(c.demoMod, true);
  assert.equal(c.twilio.authToken, '');
  assert.equal(c.panel.parolaHash, '');
  assert.ok(c.genelAdres.startsWith('http://localhost'), 'genel adres yerele duser');
});

test('gercek kurulumda GENEL_ADRES zorunludur', () => {
  assert.throws(
    () => configYukle({ DEMO_MOD: 'false', GENEL_ADRES: '' }),
    /GENEL_ADRES/,
    'eksik ayarla sunucu acilmamali'
  );
});

test('ElevenLabs varsayilanlari Turkce icin dogru', () => {
  const c = configYukle({ DEMO_MOD: 'true' });
  assert.equal(c.ses.model, 'eleven_flash_v2_5', 'Turkce destekli, en dusuk gecikmeli model');
  assert.ok(c.ses.voiceId.length > 0, 'varsayilan ses kimligi olmali');
});

test('asistan ayarlari ASISTAN_ onekiyle okunur', () => {
  // CLAUDE_* adlari bazi ortamlarda baska amacla tanimli; ayarimizi ezmemeli.
  const c = configYukle({ DEMO_MOD: 'true', CLAUDE_EFFORT: 'max', ASISTAN_EFFORT: 'low' });
  assert.equal(c.claude.effort, 'low');
});

test('onayli isaretli ama bandi bos fiyat sunucuyu actirmaz', () => {
  assert.throws(
    () =>
      configYukle({
        DEMO_MOD: 'true',
        KLINIK_CONFIG: path.join(__dirname, 'sabit', 'bozuk-fiyat.json'),
      }),
    /alt\/ust bandi bos/,
    'sessizce yanlis fiyat soylemektense hic acilmasin'
  );
});
