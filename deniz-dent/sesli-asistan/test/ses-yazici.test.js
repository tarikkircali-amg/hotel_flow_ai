'use strict';

// Twilio'ya giden token akisi.
// Onemli: `last: true` tam olarak bir kez ve en son parcada gitmeli.
// Yanlis `last` -> ya konusma erken kesilir ya hasta sessizlikte bekler.

const test = require('node:test');
const assert = require('node:assert/strict');
const { SesYazici } = require('../src/ses-yazici');

function sahteWs() {
  return {
    OPEN: 1,
    readyState: 1,
    gonderilen: [],
    send(ham) {
      this.gonderilen.push(JSON.parse(ham));
    },
  };
}

test('parcalar sirayla gider, son parca last=true tasir', () => {
  const ws = sahteWs();
  const y = new SesYazici(ws);

  y.yaz('Merhaba');
  y.yaz(', ');
  y.yaz('hoş geldiniz.');
  y.bitir();

  assert.equal(ws.gonderilen.length, 3);
  assert.deepEqual(ws.gonderilen.map((m) => m.token), ['Merhaba', ', ', 'hoş geldiniz.']);
  assert.deepEqual(ws.gonderilen.map((m) => m.last), [false, false, true]);
});

test('tek parca da last=true ile gider', () => {
  const ws = sahteWs();
  const y = new SesYazici(ws);
  y.yaz('Tamam.');
  y.bitir();

  assert.equal(ws.gonderilen.length, 1);
  assert.equal(ws.gonderilen[0].last, true);
});

test('hic parca yoksa bos token gonderilmez', () => {
  const ws = sahteWs();
  const y = new SesYazici(ws);
  y.bitir();
  assert.equal(ws.gonderilen.length, 0, 'Twilio bos token kabul etmiyor');
});

test('bos string ve null parcalar atlanir', () => {
  const ws = sahteWs();
  const y = new SesYazici(ws);
  y.yaz('');
  y.yaz(null);
  y.yaz(undefined);
  y.yaz('Var.');
  y.bitir();

  assert.equal(ws.gonderilen.length, 1);
  assert.equal(ws.gonderilen[0].token, 'Var.');
});

test('kesinti bekleyen parcayi dusurur', () => {
  const ws = sahteWs();
  const y = new SesYazici(ws);

  y.yaz('Implant tedavisi');   // bekliyor
  y.yaz(' hakkinda');          // ilki gider, ikincisi bekler
  y.iptal();                   // hasta sozu kesti
  y.bitir();

  assert.equal(ws.gonderilen.length, 1);
  assert.equal(ws.gonderilen[0].token, 'Implant tedavisi');
  assert.equal(ws.gonderilen[0].last, false, 'kesilen konusma tamamlanmis sayilmaz');
});

test('kapali yazici hicbir sey gondermez', () => {
  const ws = sahteWs();
  const y = new SesYazici(ws);
  y.kapali = true;
  y.yaz('bir şey');
  y.bitir();
  assert.equal(ws.gonderilen.length, 0);
});

test('soket kapaliysa gonderim denenmez', () => {
  const ws = sahteWs();
  ws.readyState = 3; // CLOSED
  const y = new SesYazici(ws);
  y.yaz('a');
  y.yaz('b');
  y.bitir();
  assert.equal(ws.gonderilen.length, 0);
});

test('gonderilen mesaj Twilio sozlesmesine uyar', () => {
  const ws = sahteWs();
  const y = new SesYazici(ws);
  y.yaz('Merhaba');
  y.bitir();

  const m = ws.gonderilen[0];
  assert.equal(m.type, 'text');
  assert.equal(typeof m.token, 'string');
  assert.equal(typeof m.last, 'boolean');
  assert.equal(m.interruptible, true);
});
