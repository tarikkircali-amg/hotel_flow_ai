'use strict';

// ACIL TARAMA TESTLERI
//
// Bu dosyadaki testler urunun en kritik davranisini korur: acil bir cagrida
// asistan bilgi vermeye calismamali, dogrudan yonlendirmeli.
// Yanlis negatif (acili kacirmak) kabul edilemez.

const test = require('node:test');
const assert = require('node:assert/strict');
const { acilMi, acilYanit } = require('../src/acil');

const klinik = {
  acil: {
    anahtar_kelimeler: [
      'kanama', 'kanıyor', 'kan durmuyor',
      'kırıldı', 'koptu',
      'şişti', 'apse',
      'dayanılmaz', 'çok şiddetli',
      'nefes',
    ],
    yanit: 'Sizi hemen yetkilimize bağlıyorum.',
    yanit_aktarim_yoksa: 'Lütfen en yakın acil servise başvurun.',
  },
};

test('acil ifadeleri yakalanir', () => {
  const ornekler = [
    'diş etimde kanama var',
    'dişim kırıldı ne yapmalıyım',
    'yanağım şişti çok fena',
    'ağrı dayanılmaz durumda',
    'kaplama koptu',
    'apse oluşmuş sanırım',
  ];
  for (const soz of ornekler) {
    assert.equal(acilMi(klinik, soz).acil, true, `yakalanmali: "${soz}"`);
  }
});

test('acil olmayan siradan sorular tetiklemez', () => {
  const ornekler = [
    'implant fiyatı ne kadar',
    'yarın saat kaçta açıksınız',
    'diş taşı temizliği yaptırmak istiyorum',
    'adresiniz neresi',
    'randevumu değiştirebilir miyim',
  ];
  for (const soz of ornekler) {
    assert.equal(acilMi(klinik, soz).acil, false, `tetiklememeli: "${soz}"`);
  }
});

test('kelime siniri korunur - parca eslesmesi olmaz', () => {
  // "kan" anahtar kelimesi yok ama "kanama" var; "kanepe" tetiklememeli.
  assert.equal(acilMi(klinik, 'kanepede otururken aklıma geldi').acil, false);
  // "nefes" gecerli bir anahtar; "nefesim daralıyor" yakalanmali (sonek serbest).
  assert.equal(acilMi(klinik, 'nefesim daralıyor').acil, true);
});

test('turkce buyuk/kucuk harf ve noktalama fark etmez', () => {
  assert.equal(acilMi(klinik, 'KANAMA VAR!!!').acil, true);
  assert.equal(acilMi(klinik, 'Kırıldı...').acil, true);
});

test('bos veya anlamsiz girdi acil degildir', () => {
  assert.equal(acilMi(klinik, '').acil, false);
  assert.equal(acilMi(klinik, null).acil, false);
  assert.equal(acilMi(klinik, '   ').acil, false);
});

test('tetikleyen kelime geri dondurulur - denetim kaydi icin sart', () => {
  const sonuc = acilMi(klinik, 'ağzımda kanama var');
  assert.equal(sonuc.acil, true);
  assert.equal(sonuc.tetikleyen, 'kanama');
});

test('aktarim numarasi varsa aktarilir', () => {
  const y = acilYanit(klinik, '+905321234567');
  assert.equal(y.aktar, true);
  assert.equal(y.hedef, '+905321234567');
  assert.equal(y.metin, klinik.acil.yanit);
});

test('aktarim numarasi yoksa sessiz kalinmaz, sozlu yonlendirme yapilir', () => {
  const y = acilYanit(klinik, null);
  assert.equal(y.aktar, false);
  assert.equal(y.metin, klinik.acil.yanit_aktarim_yoksa);
  assert.ok(y.metin.length > 0);
});
