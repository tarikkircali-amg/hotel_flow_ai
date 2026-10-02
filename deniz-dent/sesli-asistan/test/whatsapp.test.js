'use strict';

// WHATSAPP KANALI

process.env.DEMO_MOD = 'true';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const wa = require('../src/whatsapp');

const SIR = 'test-app-secret';
const imzala = (govde) =>
  'sha256=' + crypto.createHmac('sha256', SIR).update(govde).digest('hex');

// ------------------------------------------------------------- imza

test('dogru imza kabul ediliyor', () => {
  const g = Buffer.from('{"entry":[]}');
  assert.strictEqual(wa.imzaGecerli(g, imzala(g), SIR), true);
});

test('govde degistirilince imza REDDEDILIYOR', () => {
  const g = Buffer.from('{"entry":[]}');
  const imza = imzala(g);
  assert.strictEqual(wa.imzaGecerli(Buffer.from('{"entry":[1]}'), imza, SIR), false);
});

test('yanlis sir ile imza reddediliyor', () => {
  const g = Buffer.from('{"a":1}');
  assert.strictEqual(wa.imzaGecerli(g, imzala(g), 'baska-sir'), false);
});

test('imza basligi yoksa reddediliyor', () => {
  const g = Buffer.from('{}');
  assert.strictEqual(wa.imzaGecerli(g, undefined, SIR), false);
  assert.strictEqual(wa.imzaGecerli(g, '', SIR), false);
});

test('sha256= oneki olmayan baslik reddediliyor', () => {
  const g = Buffer.from('{}');
  const ham = crypto.createHmac('sha256', SIR).update(g).digest('hex');
  assert.strictEqual(wa.imzaGecerli(g, ham, SIR), false);
});

test('sir tanimli degilse HICBIR imza gecmiyor - fail closed', () => {
  const g = Buffer.from('{}');
  assert.strictEqual(wa.imzaGecerli(g, imzala(g), ''), false);
  assert.strictEqual(wa.imzaGecerli(g, imzala(g), undefined), false);
});

test('farkli uzunlukta imza patlatmiyor', () => {
  // timingSafeEqual farkli uzunlukta exception atar; onu yakalamayi unutmak
  // webhook'u 500'e dusururdu.
  assert.strictEqual(wa.imzaGecerli(Buffer.from('{}'), 'sha256=kisa', SIR), false);
});

// --------------------------------------------------------- govde ayristirma

const govdeKur = (mesajlar) => ({
  entry: [{ changes: [{ value: { metadata: { phone_number_id: '123' }, messages: mesajlar } }] }],
});

test('metin mesaji dogru cikariliyor', () => {
  const m = wa.mesajlariCikar(
    govdeKur([{ id: 'wamid.1', from: '905321112233', type: 'text', text: { body: 'merhaba' } }])
  );
  assert.strictEqual(m.length, 1);
  assert.deepStrictEqual(
    { ...m[0] },
    { id: 'wamid.1', gonderen: '905321112233', tur: 'text', metin: 'merhaba', telefonId: '123' }
  );
});

test('metin disi mesajda metin null kaliyor', () => {
  const m = wa.mesajlariCikar(govdeKur([{ id: 'w2', from: '9053', type: 'image' }]));
  assert.strictEqual(m[0].metin, null);
  assert.strictEqual(m[0].tur, 'image');
});

test('durum bildirimleri (mesaj olmayan) atlaniyor', () => {
  // Meta teslim/okundu bildirimleri de ayni webhook'a geliyor.
  const govde = { entry: [{ changes: [{ value: { statuses: [{ id: 'x' }] } }] }] };
  assert.deepStrictEqual(wa.mesajlariCikar(govde), []);
});

test('eksik alanli kayitlar patlatmiyor, atlaniyor', () => {
  assert.deepStrictEqual(wa.mesajlariCikar({}), []);
  assert.deepStrictEqual(wa.mesajlariCikar(null), []);
  assert.deepStrictEqual(wa.mesajlariCikar({ entry: [{}] }), []);
  assert.deepStrictEqual(wa.mesajlariCikar(govdeKur([{ from: 'x' }])), []); // id yok
  assert.deepStrictEqual(wa.mesajlariCikar(govdeKur([{ id: 'x' }])), []); // gonderen yok
});

test('tek govdede birden fazla mesaj cikariliyor', () => {
  const m = wa.mesajlariCikar(
    govdeKur([
      { id: 'a', from: '1', type: 'text', text: { body: 'bir' } },
      { id: 'b', from: '2', type: 'text', text: { body: 'iki' } },
    ])
  );
  assert.strictEqual(m.length, 2);
});

// ------------------------------------------------------------ tekrar eleme

test('ayni mesaj ikinci kez islenmiyor', () => {
  wa._islenenler.clear();
  assert.strictEqual(wa.tekrarMi('wamid.ayni'), false, 'ilk gelis islenmelidir');
  assert.strictEqual(wa.tekrarMi('wamid.ayni'), true, 'ikinci gelis elenmelidir');
});

test('farkli mesajlar birbirini engellemiyor', () => {
  wa._islenenler.clear();
  assert.strictEqual(wa.tekrarMi('a'), false);
  assert.strictEqual(wa.tekrarMi('b'), false);
});

// ----------------------------------------------------------- yapilandirma

test('yapilandirma eksikse kanal kapali', () => {
  // Demo ortaminda WhatsApp degiskenleri bos; kanal acilmamali.
  assert.strictEqual(wa.aktifMi(), false);
});

test('index.js kanali yalnizca yapilandirma tamsa aciyor', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const kaynak = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
  assert.match(kaynak, /if \(wa\.aktifMi\(\)\)/, 'kanal kosulsuz aciliyor');
});

test('metin disi icerik modele gitmiyor', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const kaynak = fs.readFileSync(path.join(__dirname, '..', 'src', 'whatsapp.js'), 'utf8');
  // Fotograf/ses notu modele gonderilmemeli (§5). Kodun bu dalda
  // yanitla() cagirmadigini, erken donduðunu dogruluyoruz.
  const dal = kaynak.slice(kaynak.indexOf("mesaj.tur !== 'text'"));
  const erkenDonus = dal.indexOf('return;');
  const yanitlaCagrisi = dal.indexOf('gorusme.yanitla');
  assert.ok(erkenDonus > 0 && erkenDonus < yanitlaCagrisi, 'metin disi icerik modele gidiyor');
});
