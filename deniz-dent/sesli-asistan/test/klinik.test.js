'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mesaiIcinde, sonrakiAcilis, fiyatBandi, tarihNormalize } = require('../src/klinik');

const klinik = {
  klinik: { zaman_dilimi: 'Europe/Istanbul' },
  mesai: {
    haftalik: [
      { gun: 1, acilis: '09:00', kapanis: '18:00' },
      { gun: 2, acilis: '09:00', kapanis: '18:00' },
      { gun: 3, acilis: '09:00', kapanis: '18:00' },
      { gun: 4, acilis: '09:00', kapanis: '18:00' },
      { gun: 5, acilis: '09:00', kapanis: '18:00' },
      { gun: 6, acilis: '09:00', kapanis: '13:00' },
    ],
    kapali_gunler: ['2026-10-29'],
  },
  fiyatlar: [
    { islem: 'Muayene', onayli: true, alt: 500, ust: 800, birim: 'TL' },
    { islem: 'İmplant', onayli: false, alt: null, ust: null, aciklama: 'Onay bekliyor' },
    { islem: 'Zirkonyum kaplama', onayli: true, alt: 6000, ust: 9000, birim: 'TL' },
  ],
};

// Istanbul UTC+3. Asagidaki UTC saatleri bilerek secildi.
const an = (isoUtc) => new Date(isoUtc);

test('mesai icinde/disinda dogru hesaplanir', () => {
  // 2026-10-05 Pazartesi, 11:00 Istanbul = 08:00 UTC
  assert.equal(mesaiIcinde(klinik, an('2026-10-05T08:00:00Z')), true, 'Pazartesi 11:00 acik');
  // 23:40 Istanbul = 20:40 UTC
  assert.equal(mesaiIcinde(klinik, an('2026-10-05T20:40:00Z')), false, 'Pazartesi 23:40 kapali');
  // 08:00 Istanbul = 05:00 UTC (acilistan once)
  assert.equal(mesaiIcinde(klinik, an('2026-10-05T05:00:00Z')), false, 'Pazartesi 08:00 kapali');
  // 18:00 tam kapanis - kapali sayilir
  assert.equal(mesaiIcinde(klinik, an('2026-10-05T15:00:00Z')), false, 'kapanis ani kapali');
});

test('pazar gunu her saat kapalidir', () => {
  // 2026-10-04 Pazar, 12:00 Istanbul
  assert.equal(mesaiIcinde(klinik, an('2026-10-04T09:00:00Z')), false);
});

test('cumartesi yarim gun dogru uygulanir', () => {
  // 2026-10-03 Cumartesi, 11:00 Istanbul = 08:00 UTC -> acik
  assert.equal(mesaiIcinde(klinik, an('2026-10-03T08:00:00Z')), true);
  // 14:00 Istanbul = 11:00 UTC -> kapali
  assert.equal(mesaiIcinde(klinik, an('2026-10-03T11:00:00Z')), false);
});

test('kapali gun mesai saatini ezer', () => {
  // 2026-10-29 Persembe, 11:00 Istanbul - normalde acik ama kapali_gunler'de
  assert.equal(mesaiIcinde(klinik, an('2026-10-29T08:00:00Z')), false);
});

test('sonraki acilis dogru gunu bulur', () => {
  // Pazartesi 23:40 -> Sali 09:00
  const s = sonrakiAcilis(klinik, an('2026-10-05T20:40:00Z'));
  assert.equal(s.saat, '09:00');
  assert.equal(s.gunSonra, 1);
  assert.equal(s.gunAdi, 'Salı');
});

test('sonraki acilis ayni gun icinde de bulunur', () => {
  // Pazartesi 07:00 Istanbul (04:00 UTC) -> ayni gun 09:00
  const s = sonrakiAcilis(klinik, an('2026-10-05T04:00:00Z'));
  assert.equal(s.gunSonra, 0);
  assert.equal(s.saat, '09:00');
});

test('sonraki acilis kapali gunu atlar', () => {
  // 2026-10-28 Carsamba 23:00 Istanbul -> 29'u kapali, 30 Cuma olmali
  const s = sonrakiAcilis(klinik, an('2026-10-28T20:00:00Z'));
  assert.equal(s.tarih, '2026-10-30');
});

// --- Fiyat yonetisimi: urunun en riskli parcasi -------------------------

test('onayli fiyat bandi dogru doner', () => {
  const f = fiyatBandi(klinik, 'muayene');
  assert.equal(f.bulundu, true);
  assert.equal(f.onayli, true);
  assert.equal(f.alt, 500);
  assert.equal(f.ust, 800);
});

test('ONAYSIZ fiyat asla rakam sizdirmaz', () => {
  const f = fiyatBandi(klinik, 'implant');
  assert.equal(f.bulundu, true);
  assert.equal(f.onayli, false);
  assert.equal(f.alt, undefined, 'onaysiz kayitta alt band disari cikmamali');
  assert.equal(f.ust, undefined, 'onaysiz kayitta ust band disari cikmamali');
});

test('listede olmayan islem icin uydurma yapilmaz', () => {
  const f = fiyatBandi(klinik, 'gülüş tasarımı');
  assert.equal(f.bulundu, false);
  assert.equal(f.onayli, false);
});

test('turkce karakter ve kismi eslesme calisir', () => {
  assert.equal(fiyatBandi(klinik, 'İMPLANT').bulundu, true);
  assert.equal(fiyatBandi(klinik, 'zirkonyum').onayli, true);
  assert.equal(fiyatBandi(klinik, 'Zirkonyum Kaplama').alt, 6000);
});

// --- Tarih ------------------------------------------------------------

test('tarih sadece YYYY-AA-GG kabul eder', () => {
  assert.equal(tarihNormalize('2026-10-14'), '2026-10-14');
  assert.equal(tarihNormalize('yarın'), null);
  assert.equal(tarihNormalize('14.10.2026'), null);
  assert.equal(tarihNormalize(''), null);
  assert.equal(tarihNormalize(null), null);
});

test('gecersiz takvim tarihi reddedilir', () => {
  assert.equal(tarihNormalize('2026-02-31'), null);
  assert.equal(tarihNormalize('2026-13-01'), null);
  assert.equal(tarihNormalize('2026-00-10'), null);
});
