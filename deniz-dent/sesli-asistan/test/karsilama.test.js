'use strict';

// KARSILAMA VE KVKK BILGILENDIRMESI - spesifikasyon §4

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
  kvkk: { konum: 'ortada', sozlu_bilgilendirme: 'Gorusme yazili kaydediliyor.' },
};

const kopya = (d = {}) => JSON.parse(JSON.stringify({ ...K, kvkk: { ...K.kvkk, ...d } }));

test('KVKK cumlesi karsilamada yer alir', () => {
  assert.ok(karsilamaKur(K, false).includes('Gorusme yazili kaydediliyor.'));
});

test('varsayilan konum: bilgilendirme DAVETTEN ONCE gelir', () => {
  // Kritik sart: hasta konusmaya davet edilmeden once bilgilendirilmis olmali.
  const m = karsilamaKur(K, false);
  assert.ok(
    m.indexOf('kaydediliyor') < m.indexOf('Nasil yardimci'),
    `bilgilendirme davetten sonra kalmis: ${m}`
  );
});

test('varsayilan konum: kimlik bilgilendirmeden ONCE gelir', () => {
  // Telefonda ilk cumle hukuki metin olursa insanlar kapatiyor.
  const m = karsilamaKur(K, false);
  assert.ok(m.indexOf('yapay zeka') < m.indexOf('kaydediliyor'), m);
});

test('konum=basta bilgilendirmeyi one alir', () => {
  const m = karsilamaKur(kopya({ konum: 'basta' }), false);
  assert.ok(m.startsWith('Gorusme yazili kaydediliyor.'), m);
});

test('konum=sonda bilgilendirmeyi sona alir', () => {
  const m = karsilamaKur(kopya({ konum: 'sonda' }), false);
  assert.ok(m.endsWith('Gorusme yazili kaydediliyor.'), m);
});

test('mesai ici ve disi farkli kapsam cumlesi kullanir', () => {
  assert.ok(karsilamaKur(K, true).includes('Randevu olusturabilirim'));
  assert.ok(karsilamaKur(K, false).includes('Mesai disindayiz'));
});

test('yapay zeka oldugu SAKLANMAZ', () => {
  // Spesifikasyon §6/§1: insan taklidi yasak.
  assert.match(karsilamaKur(K, false), /yapay zeka/i);
});

test('bos parcalar cift bosluk birakmaz', () => {
  const m = karsilamaKur(K, false);
  assert.ok(!m.includes('  '), `cift bosluk: ${JSON.stringify(m)}`);
});

test('parcali yapilandirma yoksa eski metne duser', () => {
  const eski = { karsilama: { mesai_disi: 'Eski metin.', mesai_ici: 'Eski ici.' } };
  assert.strictEqual(karsilamaKur(eski, false), 'Eski metin.');
  assert.strictEqual(karsilamaKur(eski, true), 'Eski ici.');
});

test('bilgilendirme metni bossa karsilama yine de kurulur', () => {
  const m = karsilamaKur(kopya({ sozlu_bilgilendirme: '' }), false);
  assert.ok(m.includes('Hos geldiniz'));
  assert.ok(m.includes('Nasil yardimci'));
});

test('demo klinigi: karsilama telefon icin makul uzunlukta', () => {
  // 40 kelime ustu telefonda uzun: hasta dinlemeden konusmaya basliyor.
  const demo = require('../config/klinik.demo.json');
  for (const acik of [true, false]) {
    const kelime = karsilamaKur(demo, acik).split(/\s+/).length;
    assert.ok(kelime <= 40, `karsilama ${kelime} kelime - telefon icin uzun`);
  }
});

test('demo klinigi: ses kaydi alinmadigi acikca soyleniyor', () => {
  const demo = require('../config/klinik.demo.json');
  assert.match(karsilamaKur(demo, false), /ses kaydı alınmıyor/i);
});

// -------------------------------------------------- seslendirme kalitesi

test('hastaya okunan metinlerde Turkce karakterler eksik degil', () => {
  // Kod yorumlari ASCII, ama HASTAYA OKUNAN metinler oyle olamaz:
  // "uzgunum" ve "aktariyorum" seslendirmede yanlis telaffuz ediliyor.
  // Bu test, hasta metinlerine ASCII yazip gecmeyi engelliyor.
  const demo = require('../config/klinik.demo.json');

  const metinler = [
    demo.karsilama?.teknik_aktarim,
    demo.kvkk?.sozlu_bilgilendirme,
    demo.acil?.yanit,
    demo.insana_aktar?.varsayilan_metin,
    ...Object.values(demo.insana_aktar?.metinler ?? {}),
    ...Object.values(demo.karsilama?.parcalar ?? {}),
  ].filter((m) => typeof m === 'string' && m.trim());

  assert.ok(metinler.length >= 8, 'kontrol edilecek metin sayisi beklenenden az');

  // Turkce karaktersiz yazilmis tipik kelimeler.
  const supheli = [
    /\baktariyorum\b/i, /\buzgunum\b/i, /\blutfen\b/i, /\bgorusme\b/i,
    /\bdegerlendirme/i, /\bkisisel\b/i, /\bkalin\b/i,
    /\bsurede\b/i, /\bdonus\b/i, /\byardimci\b/i, /\bnasil\b/i,
  ];

  for (const metin of metinler) {
    for (const kalip of supheli) {
      assert.ok(
        !kalip.test(metin),
        `Turkce karakter eksik (${kalip}) -> "${metin}"`
      );
    }
  }
});
