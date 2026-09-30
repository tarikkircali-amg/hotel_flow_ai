'use strict';

// Cumle bolucu: akan metni parca parca alip tamamlanan cumleleri cikarir.
// Amac ilk cumleyi erken seslendirip gecikmeyi dusurmek.
// Yanlis bolme -> ses kesik kesik veya sirasi bozuk calar.

const test = require('node:test');
const assert = require('node:assert/strict');

// ses.js config'e bagli; testte config'in zorunlu alanlarini karsilayalim.
process.env.DEMO_MOD = 'true';
const { CumleToplayici } = require('../src/ses');

function akit(parcalar) {
  const t = new CumleToplayici();
  const cikan = [];
  for (const p of parcalar) cikan.push(...t.ekle(p));
  cikan.push(...t.bitir());
  return cikan;
}

test('tek cumle akis bitince cikar', () => {
  assert.deepEqual(akit(['Merhaba, ', 'size nasıl ', 'yardımcı olabilirim?']), [
    'Merhaba, size nasıl yardımcı olabilirim?',
  ]);
});

test('iki cumle ayri ayri cikar', () => {
  const c = akit(['İmplant tedavisi ağız yapınıza göre değişiyor. ', 'Muayeneye bekleriz.']);
  assert.equal(c.length, 2);
  assert.equal(c[0], 'İmplant tedavisi ağız yapınıza göre değişiyor.');
  assert.equal(c[1], 'Muayeneye bekleriz.');
});

test('cumle tamamlaninca akis bitmeden cikar - gecikmeyi bu dusuruyor', () => {
  const t = new CumleToplayici();
  assert.deepEqual(t.ekle('Randevunuzu aldım. '), ['Randevunuzu aldım.']);
  assert.deepEqual(t.ekle('Ekibimiz'), []);
});

test('soru ve unlem de cumle sonu sayilir', () => {
  const c = akit(['Hangi gün uygun olur sizin için? ', 'Hemen not alayım!']);
  assert.equal(c.length, 2);
  assert.ok(c[0].endsWith('?'));
  assert.ok(c[1].endsWith('!'));
});

test('kisa kisaltmalar erken bolmez', () => {
  // "Dt." 12 karakterden kisa oldugu icin cumle sonu sayilmamali.
  const c = akit(['Dt. Selin sizi bekliyor.']);
  assert.deepEqual(c, ['Dt. Selin sizi bekliyor.']);
});

test('ondalik ve saat icindeki nokta cumleyi bolmez', () => {
  const c = akit(['Randevunuz 14.30 olarak ayarlandı.']);
  assert.deepEqual(c, ['Randevunuz 14.30 olarak ayarlandı.']);
});

test('bos akis bos dizi dondurur - bos token gondermeyelim', () => {
  assert.deepEqual(akit([]), []);
  assert.deepEqual(akit(['', '  ']), []);
});

test('bitir cagrildiktan sonra tampon temizlenir', () => {
  const t = new CumleToplayici();
  t.ekle('Yarım kalan');
  assert.deepEqual(t.bitir(), ['Yarım kalan']);
  assert.deepEqual(t.bitir(), []);
});

test('uc nokta tek cumle sayilir', () => {
  const c = akit(['Bir saniye bakıyorum… ', 'Buldum.']);
  assert.equal(c.length, 2);
});
