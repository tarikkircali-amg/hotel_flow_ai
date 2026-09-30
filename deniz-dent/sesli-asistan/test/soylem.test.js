'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { denetle } = require('../src/soylem');

const KLINIK = { tanitim: { yasakli_ifadeler: ['sehrin bir numarasi'] } };

test('"en iyi" yakalanir', () => {
  const s = denetle(KLINIK, 'Izmir in en iyi implant klinigiyiz.');
  assert.strictEqual(s.temiz, false);
  assert.ok(s.ihlaller.includes('en iyi'));
});

test('"garantili" yakalanir', () => {
  assert.strictEqual(denetle(KLINIK, 'Tedavimiz garantili.').temiz, false);
});

test('yuzde yuz basari yakalanir', () => {
  assert.strictEqual(denetle(KLINIK, '%100 basari sagliyoruz').temiz, false);
  assert.strictEqual(denetle(KLINIK, 'yuzde yuz basarili').temiz, false);
});

test('klinik dosyasindan eklenen ifade de yakalanir', () => {
  const s = denetle(KLINIK, 'Biz sehrin bir numarasiyiz');
  assert.ok(s.ihlaller.includes('sehrin bir numarasi'));
});

test('Turkce buyuk/kucuk harf ve aksan farki yakalamayi bozmaz', () => {
  assert.strictEqual(denetle(KLINIK, 'EN İYİ KLİNİK').temiz, false);
});

test('normal cumle temiz gecer', () => {
  const s = denetle(KLINIK, 'Sali gunu saat iki icin randevu olusturdum.');
  assert.strictEqual(s.temiz, true);
  assert.deepStrictEqual(s.ihlaller, []);
});

test('mevzuata uygun kacamak cevap temiz gecer', () => {
  const s = denetle(
    KLINIK,
    'Tedavi sonuclari kisiden kisiye degisir, bunu hekimimiz muayenede degerlendirir.'
  );
  assert.strictEqual(s.temiz, true);
});

test('bos ve gecersiz girdi patlatmaz', () => {
  assert.strictEqual(denetle(KLINIK, '').temiz, true);
  assert.strictEqual(denetle(KLINIK, null).temiz, true);
  assert.strictEqual(denetle(undefined, 'merhaba').temiz, true);
});

test('ayni ifade iki kez gecerse bir kez raporlanir', () => {
  const s = denetle(KLINIK, 'en iyi biziz, gercekten en iyi');
  assert.strictEqual(s.ihlaller.filter((i) => i === 'en iyi').length, 1);
});
