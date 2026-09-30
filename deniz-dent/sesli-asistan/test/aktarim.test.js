'use strict';

// ZORUNLU AKTARIM (§21) ve BILGI HAVUZU ONAYI (§16)

const test = require('node:test');
const assert = require('node:assert');
const { aktarimGerekli, aktarimMetni } = require('../src/aktarim');
const { bilgiHavuzuGecerli } = require('../src/klinik');

const KLINIK = {
  insana_aktar: {
    tetikleyiciler: [{ sebep: 'ozel', ipuclari: ['para iademi istiyorum'] }],
    metinler: { kvkk: 'Veri sorumlumuza aktariyorum.' },
    varsayilan_metin: 'Ekibe aktariyorum.',
  },
};

// ------------------------------------------------------------ aktarim

test('sikayet aktarimi tetikler', () => {
  const s = aktarimGerekli(KLINIK, 'Tedaviden memnun degilim, sikayetci olacagim');
  assert.strictEqual(s.aktar, true);
  assert.strictEqual(s.sebep, 'sikayet');
});

test('hukuki talep aktarimi tetikler', () => {
  assert.strictEqual(aktarimGerekli(KLINIK, 'Avukatimla gorustum').sebep, 'hukuki');
  assert.strictEqual(aktarimGerekli(KLINIK, 'Dava acacagim').sebep, 'hukuki');
});

test('KVKK talebi aktarimi tetikler', () => {
  const s = aktarimGerekli(KLINIK, 'Verilerimi silmenizi istiyorum');
  assert.strictEqual(s.sebep, 'kvkk');
});

test('klinik dosyasindan eklenen tetikleyici calisir', () => {
  assert.strictEqual(aktarimGerekli(KLINIK, 'para iademi istiyorum').sebep, 'ozel');
});

test('normal randevu sorusu aktarim tetiklemez', () => {
  const s = aktarimGerekli(KLINIK, 'Sali gunu randevu alabilir miyim');
  assert.strictEqual(s.aktar, false);
  assert.strictEqual(s.sebep, null);
});

test('fiyat sorusu aktarim tetiklemez', () => {
  assert.strictEqual(aktarimGerekli(KLINIK, 'Implant ne kadar').aktar, false);
});

test('bos girdi patlatmaz', () => {
  assert.strictEqual(aktarimGerekli(KLINIK, '').aktar, false);
  assert.strictEqual(aktarimGerekli(KLINIK, null).aktar, false);
  assert.strictEqual(aktarimGerekli(null, 'sikayet').aktar, true);
});

test('sebebe ozel metin varsa o kullanilir', () => {
  assert.strictEqual(aktarimMetni(KLINIK, 'kvkk'), 'Veri sorumlumuza aktariyorum.');
});

test('sebebe ozel metin yoksa varsayilana duser', () => {
  assert.strictEqual(aktarimMetni(KLINIK, 'hukuki'), 'Ekibe aktariyorum.');
});

test('klinik hic metin yazmadiysa notr bir metin doner', () => {
  const m = aktarimMetni({}, 'sikayet');
  assert.ok(m.length > 10);
  assert.ok(!m.includes('undefined'));
});

// --------------------------------------------------- bilgi havuzu onayi

const ONAYLI = {
  bilgi_havuzu: {
    surum: '2.0',
    onaylayan: 'Dt. Selin Yilmaz',
    onay_zamani: '2026-09-01',
    gecerli_baslangic: '2026-09-01',
    gecerli_bitis: '2027-09-01',
  },
};

test('onayli ve gecerli havuz kabul edilir', () => {
  const s = bilgiHavuzuGecerli(ONAYLI, new Date('2026-09-30'));
  assert.strictEqual(s.gecerli, true);
  assert.strictEqual(s.surum, '2.0');
});

test('bilgi_havuzu bolumu yoksa gecersiz', () => {
  assert.strictEqual(bilgiHavuzuGecerli({}).gecerli, false);
});

test('onaylayan bossa gecersiz', () => {
  const k = { bilgi_havuzu: { ...ONAYLI.bilgi_havuzu, onaylayan: '' } };
  const s = bilgiHavuzuGecerli(k, new Date('2026-09-30'));
  assert.strictEqual(s.gecerli, false);
  assert.match(s.sebep, /onaylayan/);
});

test('suresi dolmus havuz gecersiz', () => {
  const s = bilgiHavuzuGecerli(ONAYLI, new Date('2027-09-02'));
  assert.strictEqual(s.gecerli, false);
  assert.match(s.sebep, /suresi dolmus/);
});

test('gecerliligi henuz baslamamis havuz gecersiz', () => {
  const s = bilgiHavuzuGecerli(ONAYLI, new Date('2026-08-01'));
  assert.strictEqual(s.gecerli, false);
  assert.match(s.sebep, /henuz baslamadi/);
});

test('okunamayan tarih gecersiz sayilir - sessizce gecerli sayilmaz', () => {
  const k = { bilgi_havuzu: { ...ONAYLI.bilgi_havuzu, gecerli_bitis: 'yakinda' } };
  assert.strictEqual(bilgiHavuzuGecerli(k, new Date('2026-09-30')).gecerli, false);
});

test('ornek klinik dosyasi onaysiz gelir - kopyalayan doldurmak zorunda', () => {
  const ornek = require('../config/klinik.ornek.json');
  assert.strictEqual(bilgiHavuzuGecerli(ornek).gecerli, false);
});
