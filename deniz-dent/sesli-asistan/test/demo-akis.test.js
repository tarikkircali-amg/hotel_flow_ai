'use strict';

// DEMO AKIS TESTI
//
// Tarayicidan gelen mesajin asistana gidip sesin/metnin geri donmesine kadar
// olan boru hattini dogrular. Claude'a gercek istek atmiyoruz - ajan
// katmanini sahte bir siniftla degistiriyoruz, cunku burada test edilen sey
// modelin cevabi degil, TASIMA KATMANI: mesaj sirasi, cumle bolme, kuyruga
// yazma, olay duyurma ve aktarim sinyali.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const WebSocket = require('ws');

process.env.DEMO_MOD = 'true';
process.env.PORT = '0';

// --- Ajan katmanini sahte ile degistir (demo.js require etmeden ONCE) ---
const ajanYolu = require.resolve('../src/ajan');
const db = require('../src/db-bellek');

class SahteGorusme {
  constructor(p) {
    Object.assign(this, p);
    this.aktarim = null;
  }

  karsilama() {
    return 'Deniz Dent Diş Polikliniği, ben dijital asistanım. Nasıl yardımcı olabilirim?';
  }

  kes() {}

  async ozetle() {
    return 'Sahte özet.';
  }

  async yanitla(soz, onParca) {
    await db.mesajEkle(this.aramaId, 'hasta', soz);

    if (soz.includes('kanama')) {
      const metin = 'Anladım, bu acil olabilir. Sizi hemen yetkilimize bağlıyorum.';
      onParca(metin);
      await db.acilKaydet({
        aramaId: this.aramaId,
        arayanNo: this.arayanNo,
        tetikleyen: 'kanama',
        hastaSozu: soz,
        yonlendirme: '+905321112233',
      });
      await db.denetim({
        aktor: 'asistan',
        eylem: 'acil_tespit',
        detay: { tetikleyen: 'kanama', aktarildi: true },
        sonuc: 'aktariliyor',
      });
      this.aktarim = { hedef: '+905321112233', sebep: 'ACİL: kanama', acil: true };
      return { tamMetin: metin, acil: true, aktarim: this.aktarim };
    }

    if (soz.includes('randevu')) {
      const p1 = 'Tabii, randevunuzu oluşturuyorum. ';
      const p2 = 'Ekibimiz mesai başında teyit edecek.';
      onParca(p1);
      onParca(p2);
      await db.randevuTalebiEkle({
        aramaId: this.aramaId,
        hastaAdi: 'Ayşe Yıldırım',
        telefon: this.arayanNo,
        islem: 'diş taşı temizliği',
      });
      await db.denetim({
        aktor: 'asistan',
        eylem: 'randevu_talebi_olustur',
        sonuc: 'beklemede',
      });
      return { tamMetin: p1 + p2, acil: false, aktarim: null };
    }

    const metin = 'Bu konuda size yardımcı olayım efendim.';
    onParca(metin);
    return { tamMetin: metin, acil: false, aktarim: null };
  }
}

require.cache[ajanYolu] = {
  id: ajanYolu,
  filename: ajanYolu,
  loaded: true,
  exports: { Gorusme: SahteGorusme },
};

const demo = require('../src/demo');

// --- Test sunucusu ---
function sunucuAc() {
  const app = express();
  app.use('/demo', demo.yonlendirici());
  const sunucu = http.createServer(app);
  const ws = demo.wsKur();
  sunucu.on('upgrade', (req, socket, head) => {
    if (new URL(req.url, 'http://x').pathname === ws.yol) ws.upgrade(req, socket, head);
    else socket.destroy();
  });
  return new Promise((coz) => sunucu.listen(0, () => coz(sunucu)));
}

/** Belirtilen tipteki mesaj gelene kadar toplananlari dondurur. */
function bekle(soket, tip, zamanAsimi = 5000) {
  return new Promise((coz, red) => {
    const toplanan = [];
    const sure = setTimeout(() => red(new Error(`"${tip}" gelmedi`)), zamanAsimi);
    const dinle = (ham) => {
      const m = JSON.parse(ham.toString());
      toplanan.push(m);
      if (m.tip === tip) {
        clearTimeout(sure);
        soket.off('message', dinle);
        coz(toplanan);
      }
    };
    soket.on('message', dinle);
  });
}

function baglan(sunucu) {
  const { port } = sunucu.address();
  const soket = new WebSocket(`ws://127.0.0.1:${port}${demo.YOL_WS}`);
  return new Promise((coz, red) => {
    soket.once('open', () => coz(soket));
    soket.once('error', red);
  });
}

// ---------------------------------------------------------------------------

test('demo akisi: karsilama, yanit, kuyruk ve acil aktarimi', async (t) => {
  db.sifirla();
  const sunucu = await sunucuAc();
  const soket = await baglan(sunucu);

  t.after(async () => {
    soket.close();
    await new Promise((c) => sunucu.close(c));
  });

  await t.test('gorusme baslatilinca karsilama doner', async () => {
    soket.send(JSON.stringify({ tip: 'baslat' }));
    const mesajlar = await bekle(soket, 'bitti');

    const hazir = mesajlar.find((m) => m.tip === 'hazir');
    assert.ok(hazir, 'hazir mesaji gelmeli');
    assert.ok(hazir.aramaId, 'arama kimligi donmeli');
    assert.match(hazir.karsilama, /dijital asistan/i, 'asistan kendini tanitmali');
    assert.equal(typeof hazir.mesaiIcinde, 'boolean');
  });

  await t.test('KVKK rizasi cagri acilirken kaydedilir', () => {
    assert.equal(db.veri.rizalar.length, 1);
    assert.equal(db.veri.rizalar[0].kanal, 'demo');
  });

  await t.test('siradan soru metin parcalari halinde akar', async () => {
    soket.send(JSON.stringify({ tip: 'soz', metin: 'Merhaba' }));
    const mesajlar = await bekle(soket, 'bitti');

    const parcalar = mesajlar.filter((m) => m.tip === 'parca');
    assert.ok(parcalar.length > 0, 'metin parca parca akmali');

    const bitti = mesajlar.at(-1);
    assert.equal(bitti.acil, false);
    assert.equal(bitti.aktarim, null);
    assert.equal(typeof bitti.toplamMs, 'number');
  });

  await t.test('randevu talebi sabah kuyruguna beklemede duser', async () => {
    soket.send(JSON.stringify({ tip: 'soz', metin: 'randevu almak istiyorum' }));
    await bekle(soket, 'bitti');

    const kuyruk = await db.randevuKuyrugu();
    assert.equal(kuyruk.length, 1);
    assert.equal(kuyruk[0].durum, 'beklemede', 'asistan randevuyu kesinlestirmemeli');
    assert.equal(kuyruk[0].hasta_adi, 'Ayşe Yıldırım');
  });

  await t.test('asistanin kararlari canli olay olarak duyurulur', async () => {
    soket.send(JSON.stringify({ tip: 'soz', metin: 'randevu tekrar' }));
    const mesajlar = await bekle(soket, 'bitti');

    const olaylar = mesajlar.filter((m) => m.tip === 'olay');
    assert.ok(
      olaylar.some((o) => o.eylem === 'randevu_talebi_olustur'),
      'perde arkasi paneli bu olayi gostermeli'
    );
  });

  await t.test('ACIL durumda aktarim sinyali gelir ve kuyruga yazilir', async () => {
    soket.send(JSON.stringify({ tip: 'soz', metin: 'diş etimde kanama var' }));
    const mesajlar = await bekle(soket, 'bitti');

    const bitti = mesajlar.at(-1);
    assert.equal(bitti.acil, true, 'acil isaretlenmeli');
    assert.ok(bitti.aktarim, 'aktarim bilgisi donmeli');
    assert.match(bitti.aktarim.sebep, /ACİL/);

    const aciller = await db.acilKuyrugu();
    assert.equal(aciller.length, 1);
    assert.equal(aciller[0].tetikleyen, 'kanama');

    const olaylar = mesajlar.filter((m) => m.tip === 'olay');
    assert.ok(olaylar.some((o) => o.eylem === 'acil_tespit'));
  });

  await t.test('gorusme baslatmadan soz gonderilirse uyarilir', async () => {
    const yeni = await baglan(sunucu);
    yeni.send(JSON.stringify({ tip: 'soz', metin: 'merhaba' }));
    const mesajlar = await bekle(yeni, 'hata');
    assert.match(mesajlar.at(-1).mesaj, /başlat/i);
    yeni.close();
  });
});

test('demo API uclari sunum icin gereken bilgiyi verir', async (t) => {
  db.sifirla();
  const sunucu = await sunucuAc();
  const { port } = sunucu.address();
  t.after(() => new Promise((c) => sunucu.close(c)));

  const durum = await (await fetch(`http://127.0.0.1:${port}/demo/api/durum`)).json();
  assert.ok(durum.klinik, 'klinik adi donmeli');
  assert.equal(typeof durum.mesaiIcinde, 'boolean');
  assert.ok(Array.isArray(durum.senaryolar) && durum.senaryolar.length > 0);
  assert.ok(
    durum.senaryolar.some((s) => s.ad.includes('ACİL')),
    'acil senaryosu sunumda olmali'
  );
  assert.ok(
    durum.fiyatlar.some((f) => !f.onayli),
    'onaysiz fiyat davranisini gosterebilmek icin en az bir onaysiz kalem olmali'
  );

  const kuyruk = await (await fetch(`http://127.0.0.1:${port}/demo/api/kuyruk`)).json();
  assert.deepEqual(kuyruk.randevular, []);
  assert.deepEqual(kuyruk.aciller, []);

  const yok = await fetch(`http://127.0.0.1:${port}/demo/ses/olmayan`);
  assert.equal(yok.status, 404, 'gecersiz ses kimligi 404 donmeli');
});
