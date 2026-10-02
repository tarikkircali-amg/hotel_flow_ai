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

// ------------------------------------------------- yazili kanal davranisi

const { karsilamaKur } = require('../src/klinik');
const { Gorusme } = require('../src/ajan');

const K = {
  karsilama: {
    parcalar: {
      selam: 'Hos geldiniz.',
      kimlik: 'Ben yapay zeka asistaniyim.',
      kapsam_mesai_ici: 'Yetkiliye baglayabilirim.',
      kapsam_mesai_ici_yazili: 'Gerekirse ekibimize iletebilirim.',
      kapsam_mesai_disi: 'Mesai disindayiz.',
      secenek: '',
      davet: 'Nasil yardimci olabilirim?',
    },
  },
  kvkk: { konum: 'ortada', sozlu_bilgilendirme: 'Gorusme yazili kaydediliyor.' },
};

const gorusme = (kanal) =>
  new Gorusme({ klinik: K, aramaId: 'wa-test', callSid: 'WA1', arayanNo: '905321112233', kanal });

test('yazili kanalda karsilama CAGRI AKTARIMI vaat etmiyor', () => {
  const m = karsilamaKur(K, true, { canliAktarim: false });
  assert.ok(!m.includes('baglayabilirim'), `yazili kanalda baglama vaadi var: ${m}`);
  assert.ok(m.includes('ekibimize iletebilirim'), m);
});

test('telefonda eski cumle korunuyor', () => {
  assert.ok(karsilamaKur(K, true, { canliAktarim: true }).includes('baglayabilirim'));
});

test('yazili kanal cumlesi tanimli degilse normale duser', () => {
  const k = JSON.parse(JSON.stringify(K));
  delete k.karsilama.parcalar.kapsam_mesai_ici_yazili;
  assert.ok(karsilamaKur(k, true, { canliAktarim: false }).includes('Yetkiliye baglayabilirim'));
});

test('canli aktarim kanala gore belirleniyor', () => {
  assert.strictEqual(gorusme('telefon').canliAktarim, true);
  assert.strictEqual(gorusme('whatsapp').canliAktarim, false);
});

test('WhatsApp aktariminda hastaya DONUS YAPILACAK deniyor', async () => {
  const sonuc = await gorusme('whatsapp').insanaDevret({ sebep: 'test' });
  assert.strictEqual(sonuc.canli, false);
  assert.match(sonuc.metin, /dönüş yapılacak/i);
});

test('insana_aktar araci yazili kanalda BEKLEYIN dedirtmiyor', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const kaynak = fs.readFileSync(path.join(__dirname, '..', 'src', 'araclar.js'), 'utf8');
  assert.match(kaynak, /if \(!baglam\.canliAktarim\)/, 'arac kanal farkini gozetmiyor');
  const dal = kaynak.slice(kaynak.indexOf('if (!baglam.canliAktarim)'));
  assert.match(dal.slice(0, 600), /DEME/, 'modele "bekleyin deme" talimati verilmiyor');
});

test('WhatsApp kaydi mesai durumunu GERCEGE gore yaziyor', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const kaynak = fs.readFileSync(path.join(__dirname, '..', 'src', 'whatsapp.js'), 'utf8');
  assert.match(kaynak, /mesaiDisi: !mesaiIcinde\(config\.klinik\)/, 'mesai durumu sabit yazilmis');
});

test('demo klinigi yazili kanal metinlerini tanimliyor', () => {
  const demo = require('../config/klinik.demo.json');
  assert.ok(demo.karsilama.parcalar.kapsam_mesai_ici_yazili);
  assert.ok(demo.insana_aktar.yazili_kanal_metni);
  assert.ok(demo.whatsapp.metin_disi_yanit);
  // Yazili kanal cumlesi canli aktarim vaat etmemeli.
  assert.ok(!/bağlay/i.test(demo.karsilama.parcalar.kapsam_mesai_ici_yazili));
});
