'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { maskele, siniflandir, hastaToken, gecir } = require('../src/gizlilik');

const KLINIK = {
  saglik_kategorileri: [
    { kod: 'POST_PROCEDURE_SWELLING', ipuclari: ['implant', 'sisti', 'sislik'] },
    { kod: 'DENTAL_PAIN', ipuclari: ['agri', 'agriyor', 'sizli'] },
  ],
};

const TUZ = 'test-tuzu';

// ---------------------------------------------------------------- maskeleme

test('telefon numarasi maskelenir, son 4 hane kalir', () => {
  const { metin, bulgular } = maskele('Numaram 0532 111 22 33, arayin');
  assert.ok(!metin.includes('111 22 33'), `maskelenmemis: ${metin}`);
  assert.ok(metin.includes('***2233'), `son 4 hane yok: ${metin}`);
  assert.ok(bulgular.includes('telefon'));
});

test('+90 formatindaki numara da maskelenir', () => {
  const { metin } = maskele('+905321112233 numarasindan ulasin');
  assert.ok(metin.includes('***2233'), metin);
});

test('TC kimlik numarasi maskelenir', () => {
  const { metin, bulgular } = maskele('TC 12345678901 kaydima bakar misiniz');
  assert.ok(metin.includes('TCKN_***'), metin);
  assert.ok(!metin.includes('12345678901'));
  assert.ok(bulgular.includes('tckn'));
});

test('e-posta maskelenir', () => {
  const { metin } = maskele('ayse.yilmaz@ornek.com adresine yollayin');
  assert.ok(metin.includes('***@***'), metin);
  assert.ok(!metin.includes('ayse.yilmaz'));
});

// Bu iki test, maskelemenin gorusmeyi bozmadigini korur.
test('saat ifadesi maskelenmez', () => {
  const { metin, bulgular } = maskele('Sali gunu 14.30 uygun mu');
  assert.strictEqual(metin, 'Sali gunu 14.30 uygun mu');
  assert.strictEqual(bulgular.length, 0);
});

test('fiyat ifadesi maskelenmez', () => {
  const { metin } = maskele('Dolgu 2500 TL miymis');
  assert.ok(metin.includes('2500'), metin);
});

test('ad soyad korunur - randevu icin gerekli', () => {
  const { metin } = maskele('Adim Ayse Yildirim');
  assert.ok(metin.includes('Ayse Yildirim'), metin);
});

test('maskeleme bos girdide patlamaz', () => {
  assert.deepStrictEqual(maskele(''), { metin: '', bulgular: [] });
  assert.deepStrictEqual(maskele(null), { metin: '', bulgular: [] });
  assert.deepStrictEqual(maskele(undefined), { metin: '', bulgular: [] });
});

test('ayni metinde birden fazla kimlik maskelenir', () => {
  const { metin, bulgular } = maskele('0532 111 22 33 ve a@b.com');
  assert.ok(metin.includes('***2233'), metin);
  assert.ok(metin.includes('***@***'), metin);
  assert.ok(bulgular.includes('telefon') && bulgular.includes('eposta'));
});

// ------------------------------------------------------------ siniflandirma

test('sikayet klinik onayli kategoriye eslenir', () => {
  assert.strictEqual(
    siniflandir(KLINIK, 'implantimin oldugu yer sisti'),
    'POST_PROCEDURE_SWELLING'
  );
  assert.strictEqual(siniflandir(KLINIK, 'disim cok agriyor'), 'DENTAL_PAIN');
});

test('eslesmeyen sikayet icin kategori UYDURULMAZ', () => {
  assert.strictEqual(siniflandir(KLINIK, 'otopark var mi'), 'BELIRTILMEMIS');
});

test('kategori listesi yoksa BELIRTILMEMIS doner, patlamaz', () => {
  assert.strictEqual(siniflandir({}, 'disim agriyor'), 'BELIRTILMEMIS');
});

// -------------------------------------------------------------------- token

test('ayni numara ayni token uretir', () => {
  assert.strictEqual(hastaToken('05321112233', TUZ), hastaToken('05321112233', TUZ));
});

test('farkli numara farkli token uretir', () => {
  assert.notStrictEqual(hastaToken('05321112233', TUZ), hastaToken('05321112234', TUZ));
});

test('token ham numarayi icermez', () => {
  const t = hastaToken('05321112233', TUZ);
  assert.ok(!t.includes('5321112233'), t);
  assert.ok(t.startsWith('PAT_'));
});

test('farkli tuz farkli token uretir - tuz gercekten kullaniliyor', () => {
  assert.notStrictEqual(hastaToken('05321112233', 'a'), hastaToken('05321112233', 'b'));
});

test('tuzsuz token uretilemez', () => {
  assert.throws(() => hastaToken('05321112233', ''), /tuz zorunlu/);
});

// ------------------------------------------------------------- tam gecis

test('gecis: LLM metni maskeli, kayit siniflandirilmis', () => {
  const sonuc = gecir({
    klinik: KLINIK,
    soz: 'Ben Ayse, implantimin oldugu yer sisti, numaram 0532 111 22 33',
    tanimlayici: '05321112233',
    tuz: TUZ,
  });

  assert.ok(!sonuc.llmMetni.includes('111 22 33'), sonuc.llmMetni);
  assert.strictEqual(sonuc.kayit.complaint_category, 'POST_PROCEDURE_SWELLING');
  assert.strictEqual(sonuc.kayit.urgency, 'REVIEW_REQUIRED');
  assert.strictEqual(sonuc.kayit.raw_identity_removed, true);
  assert.ok(sonuc.kayit.patient_token.startsWith('PAT_'));
});

test('acil bayragi aciliyeti ACIL yapar', () => {
  const sonuc = gecir({
    klinik: KLINIK,
    soz: 'dis etimde kanama var durmuyor',
    tanimlayici: '05321112233',
    tuz: TUZ,
    acil: true,
  });
  assert.strictEqual(sonuc.kayit.urgency, 'ACIL');
});

test('kimlik yoksa raw_identity_removed false olur', () => {
  const sonuc = gecir({
    klinik: KLINIK,
    soz: 'otopark var mi',
    tanimlayici: '05321112233',
    tuz: TUZ,
  });
  assert.strictEqual(sonuc.kayit.raw_identity_removed, false);
  assert.strictEqual(sonuc.kayit.urgency, 'NORMAL');
});

// ------------------------------------------------ denetim kaydi suzgeci

const { denetimDetayiTemizle } = require('../src/gizlilik');

test('ham metin cagristiran anahtarlar dusurulur', () => {
  const t = denetimDetayiTemizle({ hasta_sozu: 'disim agriyor', tetikleyen: 'agri' });
  assert.ok(t.hasta_sozu.includes('dusuruldu'), JSON.stringify(t));
  assert.strictEqual(t.tetikleyen, 'agri');
});

test('kalan metinlerdeki telefon maskelenir', () => {
  const t = denetimDetayiTemizle({ hedef: 'arayan 0532 111 22 33' });
  assert.ok(t.hedef.includes('***2233'), t.hedef);
});

test('cok uzun metin kirpilir - dokum sizmasin', () => {
  const t = denetimDetayiTemizle({ aciklama: 'a'.repeat(500) });
  assert.ok(t.aciklama.length < 250, `uzunluk: ${t.aciklama.length}`);
  assert.ok(t.aciklama.endsWith('[kirpildi]'));
});

test('ic ice nesneler de temizlenir', () => {
  const t = denetimDetayiTemizle({ kayit: { metin: 'gizli', kod: 'X1' } });
  assert.ok(t.kayit.metin.includes('dusuruldu'));
  assert.strictEqual(t.kayit.kod, 'X1');
});

test('sayi ve mantiksal degerler bozulmaz', () => {
  const t = denetimDetayiTemizle({ adet: 3, aktarildi: true, yok: null });
  assert.strictEqual(t.adet, 3);
  assert.strictEqual(t.aktarildi, true);
  assert.strictEqual(t.yok, null);
});

test('bos detay null doner', () => {
  assert.strictEqual(denetimDetayiTemizle(null), null);
  assert.strictEqual(denetimDetayiTemizle(undefined), null);
});

test('db katmani denetim detayini otomatik temizler', () => {
  process.env.DEMO_MOD = 'true';
  const db = require('../src/db');
  // Cagri yerlerinde tek tek dikkat etmeye guvenmiyoruz; suzgec
  // depoya giden yolda oldugu icin her cagri kapsaniyor.
  assert.notStrictEqual(db.denetim, require('../src/db-bellek').denetim);
});
