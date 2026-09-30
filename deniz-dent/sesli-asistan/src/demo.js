'use strict';

// DEMO SUNUMU
//
// Telefon numarasi ve Postgres olmadan, gercek asistanin aynisini tarayicida
// calistirir. Gosterilen her sey gercek: ayni acil taramasi, ayni fiyat
// yonetisimi, ayni araclar, ayni sabah kuyrugu.
//
// Tek fark giris/cikis kanali: telefon yerine tarayici.

const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');
const { WebSocketServer } = require('ws');

const config = require('./config');
const db = require('./db');
const ses = require('./ses');
const { Gorusme } = require('./ajan');
const { mesaiIcinde, sonrakiAcilis } = require('./klinik');

const YOL_WS = '/demo/ws';

// Sunumda tek tikla oynatilacak senaryolar.
// Her biri urunun ayri bir davranisini gosteriyor.
const SENARYOLAR = [
  {
    ad: 'Fiyat sorusu',
    aciklama: 'Onaylı bant varsa söyler, yoksa muayeneye yönlendirir',
    adimlar: ['Merhaba, implant fiyatlarını öğrenebilir miyim?'],
  },
  {
    ad: 'Onaysız fiyat',
    aciklama: 'Listede olmayan işlemde rakam uydurmaz',
    adimlar: ['Gülüş tasarımı ne kadar tutar?'],
  },
  {
    ad: 'Randevu talebi',
    aciklama: 'Bilgileri toplar, geri okuyarak teyit eder, kuyruğa yazar',
    adimlar: [
      'Diş taşı temizliği için randevu almak istiyorum',
      'Adım Ayşe Yıldırım, numaram 0532 111 22 33',
      'Önümüzdeki salı öğleden sonra olur mu',
    ],
  },
  {
    ad: 'ACİL durum',
    aciklama: 'Yapay zekâya gitmeden yakalanır, doğrudan yönlendirilir',
    adimlar: ['Diş etimde kanama var, durmuyor'],
  },
  {
    ad: 'Fiyat pazarlığı',
    aciklama: 'İndirim yetkisi yok, ekibe devreder',
    adimlar: ['Biraz indirim yapamaz mısınız?'],
  },
  {
    ad: 'Yetkiliye bağlan',
    aciklama: 'Tartışmaz, anında insana aktarır',
    adimlar: ['Ben bir yetkiliyle görüşmek istiyorum'],
  },
  {
    ad: 'Bilmediği soru',
    aciklama: 'Uydurmaz, bilmediğini söyler',
    adimlar: ['Otoparkınızda elektrikli araç şarj istasyonu var mı?'],
  },
];

function yonlendirici() {
  const r = express.Router();
  r.use(express.json({ limit: '64kb' }));

  // Uretilen ses. Tek kullanimlik, bellekte, 10 dakika sonra silinir.
  r.get('/ses/:id', (req, res) => {
    const kayit = ses.getir(req.params.id);
    if (!kayit) return res.status(404).end();
    res.set('Content-Type', kayit.tur);
    res.set('Cache-Control', 'no-store');
    return res.send(kayit.govde);
  });

  r.get('/api/durum', async (_req, res) => {
    const acik = mesaiIcinde(config.klinik);
    const sonraki = sonrakiAcilis(config.klinik);
    res.json({
      klinik: config.klinik.klinik.ad,
      mesaiIcinde: acik,
      sonrakiAcilis: sonraki,
      sesAcik: ses.acikMi(),
      model: config.claude.model,
      senaryolar: SENARYOLAR,
      fiyatlar: (config.klinik.fiyatlar ?? []).map((f) => ({
        islem: f.islem,
        onayli: Boolean(f.onayli),
      })),
    });
  });

  r.get('/api/kuyruk', async (_req, res) => {
    const [randevular, aciller] = await Promise.all([db.randevuKuyrugu(), db.acilKuyrugu()]);
    res.json({ randevular, aciller });
  });

  r.post('/api/sifirla', (_req, res) => {
    if (db.sifirla) db.sifirla();
    res.json({ ok: true });
  });

  r.use('/', express.static(path.join(__dirname, '..', 'public', 'demo')));
  return r;
}

function wsKur() {
  const wss = new WebSocketServer({ noServer: true });

  const upgrade = (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
  };

  wss.on('connection', (ws) => {
    const durum = { gorusme: null, arama: null, mesgul: false };
    const yolla = (nesne) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(nesne));
    };

    // Asistanin ic kararlarini (denetim kayitlari) canli gosteriyoruz.
    const birak = db.dinle
      ? db.dinle((olay) => {
          if (olay.tur !== 'denetim') return;
          if (durum.arama && olay.kaynakId && olay.kaynakId !== durum.arama.id) {
            // baska bir cagriya ait degilse gec - randevu/acil id'leri de gelir
          }
          yolla({
            tip: 'olay',
            eylem: olay.eylem,
            detay: olay.detay ?? null,
            sonuc: olay.sonuc ?? null,
          });
        })
      : () => {};

    ws.on('message', async (ham) => {
      let m;
      try {
        m = JSON.parse(ham.toString());
      } catch {
        return;
      }

      try {
        if (m.tip === 'baslat') return await baslat(m, durum, yolla);
        if (m.tip === 'tus') {
          if (!durum.gorusme) return yolla({ tip: 'hata', mesaj: 'Önce görüşmeyi başlatın.' });
          const metin = await durum.gorusme.tusaBasildi(m.deger, (p) =>
            yolla({ tip: 'parca', metin: p })
          );
          if (!metin) return yolla({ tip: 'bitti' });
          const s2 = await ses.seslendir(metin);
          if (s2) yolla({ tip: 'ses', yol: s2.yol, cumle: metin, ms: s2.ms });
          return yolla({ tip: 'bitti' });
        }
        if (m.tip === 'soz') {
          if (!durum.gorusme) return yolla({ tip: 'hata', mesaj: 'Önce görüşmeyi başlatın.' });
          // Onceki yanit (ozellikle ses uretimi) surerken gelen sozu
          // isleyemiyoruz. Ama SESSIZCE dusurmek, istemciyi cevap
          // bekletip hata ayiklamayi imkansiz hale getiriyordu.
          if (durum.mesgul) {
            return yolla({ tip: 'mesgul', mesaj: 'Onceki yanit hala suruyor.' });
          }
          durum.mesgul = true;
          try {
            await konus(m.metin, durum, yolla);
          } finally {
            durum.mesgul = false;
          }
        }
        return undefined;
      } catch (err) {
        // Hata NESNESI basilmaz: icinde hasta metni tasiyabilir (§11).
        console.error('[demo] hata:', err.message);
        durum.mesgul = false;
        return yolla({ tip: 'hata', mesaj: err.message });
      }
    });

    ws.on('close', () => birak());
    ws.on('error', (e) => console.error('[demo] soket:', e.message));
  });

  return { yol: YOL_WS, upgrade };
}

async function baslat(m, durum, yolla) {
  const callSid = 'DEMO' + crypto.randomBytes(8).toString('hex');
  const arayanNo = m.arayanNo || '+905321112233';
  const acik = mesaiIcinde(config.klinik);

  const arama = await db.aramaBaslat({
    callSid,
    kanal: 'demo',
    arayanNo,
    arananNo: '+902323333333',
    dil: 'tr-TR',
    mesaiDisi: !acik,
  });

  await db.rizaKaydet({
    aramaId: arama.id,
    telefon: arayanNo,
    kanal: 'demo',
    metinVersiyonu: config.klinik.kvkk?.metin_versiyonu ?? 'v0',
  });

  const gecmis = await db.gecmisGorusmeler(arayanNo, arama.id).catch(() => []);

  durum.arama = arama;
  durum.gorusme = new Gorusme({
    klinik: config.klinik,
    aramaId: arama.id,
    callSid,
    arayanNo,
    gecmis,
    kanal: 'demo',
  });

  const karsilama = durum.gorusme.karsilama();
  await db.mesajEkle(arama.id, 'sistem', `Karşılama: ${karsilama}`);

  yolla({ tip: 'hazir', aramaId: arama.id, arayanNo, mesaiIcinde: acik, karsilama });

  const s = await ses.seslendir(karsilama);
  if (s) yolla({ tip: 'ses', yol: s.yol, cumle: karsilama, ms: s.ms });
  yolla({ tip: 'bitti' });
}

async function konus(metin, durum, yolla) {
  const baslangic = Date.now();
  let ilkSesMs = null;

  const toplayici = new ses.CumleToplayici();
  const kuyruk = []; // seslendirme sirasini koruyalim

  const seslendirVeYolla = async (cumle) => {
    const s = await ses.seslendir(cumle);
    if (ilkSesMs === null && s) ilkSesMs = Date.now() - baslangic;
    if (s) yolla({ tip: 'ses', yol: s.yol, cumle, ms: s.ms });
  };

  const sonuc = await durum.gorusme.yanitla(metin, (parca) => {
    yolla({ tip: 'parca', metin: parca });
    for (const cumle of toplayici.ekle(parca)) {
      // Sirayi korumak icin zincirliyoruz: cumleler dogru sirayla calmali.
      kuyruk.push(cumle);
    }
  });

  for (const cumle of toplayici.bitir()) kuyruk.push(cumle);

  // Seslendirmeyi sirayla yap - paralel yapilirsa cumleler karisik calar.
  for (const cumle of kuyruk) {
    await seslendirVeYolla(cumle);
  }

  yolla({
    tip: 'bitti',
    acil: sonuc.acil,
    aktarim: sonuc.aktarim ?? null,
    toplamMs: Date.now() - baslangic,
    ilkSesMs,
  });
}

module.exports = { yonlendirici, wsKur, YOL_WS, SENARYOLAR };
