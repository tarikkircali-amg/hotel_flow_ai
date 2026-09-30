'use strict';

// TUS (DTMF) ILE AYDINLATMA METNI - spesifikasyon §4

process.env.DEMO_MOD = 'true';

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
  kvkk: {
    konum: 'ortada',
    sozlu_bilgilendirme: 'Gorusme yazili kaydediliyor.',
    tus: '7',
    tus_teklifi: "Ayrintili bilgilendirme icin 7'ye basabilirsiniz.",
    sms_teklifi: 'Detayli metni SMS ile gonderebilirim.',
    ayrintili_metin: 'Uzun aydinlatma metni.',
  },
};

// --------------------------------------------------------- karsilama

test('KISA bildirim tusa bagli DEGIL - her zaman soyleniyor', () => {
  // En kritik kural: 7'ye hic basmayan hasta da bilgilendirilmis olmali.
  for (const y of [{}, { tus: true }, { sms: true }, { tus: true, sms: true }]) {
    assert.ok(
      karsilamaKur(K, false, y).includes('Gorusme yazili kaydediliyor.'),
      `bildirim kayboldu: ${JSON.stringify(y)}`
    );
  }
});

test('tus destegi varken tus teklifi soyleniyor', () => {
  assert.match(karsilamaKur(K, false, { tus: true }), /7'ye basabilirsiniz/);
});

test('tus destegi yokken tus teklifi SOYLENMIYOR', () => {
  // Yazili kanalda (WhatsApp) tus yok; teklif etmek anlamsiz olur.
  assert.ok(!karsilamaKur(K, false, { sms: true }).includes("7'ye"));
});

test('ikisi de acikken karsilamada TEK teklif var', () => {
  const m = karsilamaKur(K, false, { tus: true, sms: true });
  assert.match(m, /7'ye basabilirsiniz/);
  assert.ok(!m.includes('SMS'), `iki teklif birden soylenmis: ${m}`);
});

test('tus yoksa SMS teklifine duser', () => {
  assert.match(karsilamaKur(K, false, { sms: true }), /SMS ile gonderebilirim/);
});

test('telefon karsilamasi 40 kelimeyi asmiyor', () => {
  const demo = require('../config/klinik.demo.json');
  for (const acik of [true, false]) {
    const n = karsilamaKur(demo, acik, { tus: true, sms: true }).split(/\s+/).length;
    assert.ok(n <= 40, `karsilama ${n} kelime - telefon icin uzun`);
  }
});

// -------------------------------------------------------- tus islemi

const { Gorusme } = require('../src/ajan');

function gorusmeKur(klinik, kanal = 'telefon') {
  return new Gorusme({ klinik, aramaId: 'test-1', callSid: 'CA1', arayanNo: '+905321112233', kanal });
}

test('yapilandirilmis tusa basinca ayrintili metin okunuyor', async () => {
  const g = gorusmeKur(K);
  const parcalar = [];
  const metin = await g.tusaBasildi('7', (p) => parcalar.push(p));
  assert.strictEqual(metin, 'Uzun aydinlatma metni.');
  assert.deepStrictEqual(parcalar, ['Uzun aydinlatma metni.']);
});

test('baska tuslar sessizce yok sayiliyor', async () => {
  const g = gorusmeKur(K);
  for (const tus of ['1', '9', '#', '*', '0']) {
    assert.strictEqual(await g.tusaBasildi(tus, () => {}), null, `${tus} isleme alindi`);
  }
});

test('metin tanimli degilse tus calismiyor - uydurma yok', async () => {
  const k = { ...K, kvkk: { ...K.kvkk, ayrintili_metin: '' } };
  assert.strictEqual(await gorusmeKur(k).tusaBasildi('7', () => {}), null);
});

test('tus yapilandirilmamissa hicbir tus calismiyor', async () => {
  const k = { ...K, kvkk: { ...K.kvkk, tus: '' } };
  assert.strictEqual(await gorusmeKur(k).tusaBasildi('7', () => {}), null);
});

test('tus sayi olarak gelse de eslesiyor', async () => {
  // Saglayici digit'i sayi gonderebilir.
  assert.ok(await gorusmeKur(K).tusaBasildi(7, () => {}));
});

test('tus destegi kanala gore belirleniyor', () => {
  assert.strictEqual(gorusmeKur(K, 'telefon').tusDestegi, true);
  assert.strictEqual(gorusmeKur(K, 'demo').tusDestegi, true);
  assert.strictEqual(gorusmeKur(K, 'whatsapp').tusDestegi, false);
});

test('relay katmani dtmf mesajini isliyor', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const kaynak = fs.readFileSync(path.join(__dirname, '..', 'src', 'twilio.js'), 'utf8');
  assert.match(kaynak, /case 'dtmf':/, 'dtmf mesaj tipi islenmiyor');
  assert.match(kaynak, /tusaBasildi/, 'tus islemi ajana baglanmamis');
});
