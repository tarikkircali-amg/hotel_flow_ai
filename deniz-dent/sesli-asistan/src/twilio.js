'use strict';

// Twilio Voice + ConversationRelay katmani.
//
// Akis:
//   1. Cagri gelir      -> POST /twilio/gelen-cagri  -> TwiML <ConversationRelay>
//   2. Twilio WS acar   -> wss://.../relay           -> setup / prompt / interrupt
//   3. Oturum biter     -> POST /twilio/relay-bitti  -> <Dial> (aktarim) veya <Hangup>

const twilio = require('twilio');
const { WebSocketServer } = require('ws');
const config = require('./config');
const db = require('./db');
const { Gorusme } = require('./ajan');
const { mesaiIcinde } = require('./klinik');
const { SesYazici } = require('./ses-yazici');

const YOL_GELEN = '/twilio/gelen-cagri';
const YOL_BITTI = '/twilio/relay-bitti';
const YOL_RELAY = '/relay';

// ---------------------------------------------------------------------------
// Imza dogrulama
// Twilio disinda hicbir kaynak bu uclara ulasamamali - aksi halde herkes
// asistanin agzindan konusabilir.
// ---------------------------------------------------------------------------
function imzaDogrula(req, res, next) {
  const imza = req.header('X-Twilio-Signature');
  const url = config.genelAdres + req.originalUrl;
  if (!imza || !twilio.validateRequest(config.twilio.authToken, imza, url, req.body ?? {})) {
    console.warn('[twilio] gecersiz imza:', req.originalUrl);
    db.denetim({
      aktor: 'sistem',
      eylem: 'imza_reddi',
      kaynak: 'http',
      kaynakId: req.originalUrl,
      ip: req.ip,
      sonuc: 'reddedildi',
    });
    return res.status(403).type('text/plain').send('Gecersiz imza');
  }
  return next();
}

function wsImzaGecerli(req) {
  const imza = req.headers['x-twilio-signature'];
  const url = config.genelAdres.replace(/^http/, 'ws') + YOL_RELAY;
  if (!imza) return false;
  return (
    twilio.validateRequest(config.twilio.authToken, imza, url, {}) ||
    // Bazi kurulumlarda imza https semasi uzerinden hesaplanir.
    twilio.validateRequest(config.twilio.authToken, imza, config.genelAdres + YOL_RELAY, {})
  );
}

// ---------------------------------------------------------------------------
// 1) Gelen cagri -> TwiML
// ---------------------------------------------------------------------------
async function gelenCagri(req, res) {
  const { CallSid, From, To } = req.body;
  const klinik = config.klinik;
  const acik = mesaiIcinde(klinik);

  try {
    const arama = await db.aramaBaslat({
      callSid: CallSid,
      kanal: 'telefon',
      arayanNo: From,
      arananNo: To,
      dil: config.twilio.dil,
      mesaiDisi: !acik,
    });

    // KVKK: hastaya karsilama metninde bilgilendirme yapiliyor, kaydi burada tutuyoruz.
    await db.rizaKaydet({
      aramaId: arama.id,
      telefon: From,
      kanal: 'telefon',
      metinVersiyonu: klinik.kvkk?.metin_versiyonu ?? 'v0',
    });

    await db.denetim({
      aktor: 'sistem',
      eylem: 'cagri_basladi',
      kaynak: 'arama',
      kaynakId: arama.id,
      detay: { from: From, to: To, mesaiDisi: !acik },
      sonuc: 'ok',
    });
  } catch (err) {
    console.error('[twilio] arama kaydi acilamadi:', err.message);
    // Veritabani yoksa bile cagriyi duşurmuyoruz; asistan hafizasiz calisir.
  }

  const yanit = new twilio.twiml.VoiceResponse();
  const baglan = yanit.connect({ action: config.genelAdres + YOL_BITTI });

  const ayarlar = {
    url: config.genelAdres.replace(/^http/, 'ws') + YOL_RELAY,
    welcomeGreeting: acik ? klinik.karsilama.mesai_ici : klinik.karsilama.mesai_disi,
    language: config.twilio.dil,
    ttsProvider: config.twilio.ttsSaglayici,
    interruptible: 'true',
  };
  if (config.twilio.ttsSes) ayarlar.voice = config.twilio.ttsSes;

  baglan.conversationRelay(ayarlar);

  res.type('text/xml').send(yanit.toString());
}

// ---------------------------------------------------------------------------
// 3) Relay oturumu bitti -> aktarim mi, kapatma mi?
// ---------------------------------------------------------------------------
async function relayBitti(req, res) {
  const { CallSid } = req.body;
  const yanit = new twilio.twiml.VoiceResponse();

  let niyet = null;
  try {
    niyet = await db.aktarimNiyetiOku(CallSid);
  } catch (err) {
    console.error('[twilio] aktarim niyeti okunamadi:', err.message);
  }

  if (niyet?.hedef_no) {
    yanit.dial({ timeout: 25, callerId: undefined }, niyet.hedef_no);
    // Aktarim cevaplanmazsa hasta sessizlikte kalmasin.
    yanit.say(
      { language: config.twilio.dil },
      'Yetkilimize şu anda ulaşamadım. Talebinizi not aldım, en kısa sürede size dönülecek. İyi günler dilerim.'
    );
  } else {
    yanit.hangup();
  }

  res.type('text/xml').send(yanit.toString());
}

// ---------------------------------------------------------------------------
// 2) WebSocket relay
// ---------------------------------------------------------------------------
function relayKur() {
  const wss = new WebSocketServer({ noServer: true });

  // Upgrade yonlendirmesi index.js'te tek elden yapilir; burada sadece
  // bu yola gelen baglantiyi kabul ediyoruz.
  const upgrade = (req, socket, head) => {
    if (!wsImzaGecerli(req)) {
      console.warn('[relay] imza dogrulanamadi, baglanti reddedildi');
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  };

  wss.on('connection', (ws) => {
    /** @type {{gorusme: Gorusme|null, yazici: SesYazici, callSid: string|null, arama: object|null}} */
    const oturum = { gorusme: null, yazici: new SesYazici(ws), callSid: null, arama: null };
    let mesgul = false;

    ws.on('message', async (ham) => {
      let mesaj;
      try {
        mesaj = JSON.parse(ham.toString());
      } catch {
        return;
      }

      try {
        switch (mesaj.type) {
          case 'setup':
            await kurulum(oturum, mesaj);
            break;

          case 'prompt':
            // Sadece tamamlanmis konusma isleme alinir.
            if (mesaj.last === false) return;
            if (!oturum.gorusme || mesgul) return;
            mesgul = true;
            try {
              await konus(oturum, mesaj.voicePrompt, ws);
            } finally {
              mesgul = false;
            }
            break;

          case 'interrupt':
            oturum.gorusme?.kes();
            oturum.yazici.iptal();
            break;

          case 'error':
            console.error('[relay] Twilio hatasi:', mesaj.description ?? mesaj);
            break;

          default:
            break;
        }
      } catch (err) {
        // Hata NESNESI basilmaz: icinde hasta metni tasiyabilir (§11).
        console.error('[relay] mesaj islenirken hata:', err.message);
        oturum.yazici.yaz(
          'Bir teknik aksaklık oldu, özür dilerim. Sizi yetkilimize aktarıyorum.'
        );
        oturum.yazici.bitir();
        await aktarimaDus(oturum, ws, 'teknik hata');
      }
    });

    ws.on('close', async () => {
      oturum.yazici.kapali = true;
      if (!oturum.arama) return;
      try {
        const ozet = await oturum.gorusme?.ozetle();
        await db.aramaBitir(oturum.arama.id, {
          durum: oturum.gorusme?.aktarim ? 'aktarildi' : 'tamamlandi',
          aktarimSebebi: oturum.gorusme?.aktarim?.sebep ?? null,
          ozet,
        });
      } catch (err) {
        console.error('[relay] kapanis islemi basarisiz:', err.message);
      }
    });

    ws.on('error', (err) => console.error('[relay] soket hatasi:', err.message));
  });

  return { yol: YOL_RELAY, upgrade };
}

async function kurulum(oturum, mesaj) {
  oturum.callSid = mesaj.callSid;

  const arama = await db.aramaBaslat({
    callSid: mesaj.callSid,
    sessionId: mesaj.sessionId,
    kanal: 'telefon',
    arayanNo: mesaj.from,
    arananNo: mesaj.to,
    dil: config.twilio.dil,
    mesaiDisi: !mesaiIcinde(config.klinik),
  });
  oturum.arama = arama;

  const gecmis = await db.gecmisGorusmeler(mesaj.from, arama.id).catch(() => []);

  oturum.gorusme = new Gorusme({
    klinik: config.klinik,
    aramaId: arama.id,
    callSid: mesaj.callSid,
    arayanNo: mesaj.from,
    gecmis,
  });

  await db.mesajEkle(arama.id, 'sistem', `Karşılama: ${oturum.gorusme.karsilama()}`);
}

async function konus(oturum, soz, ws) {
  const sonuc = await oturum.gorusme.yanitla(soz, (parca) => oturum.yazici.yaz(parca));
  oturum.yazici.bitir();

  if (sonuc.aktarim) {
    // Metnin okunmasi icin kisa bir nefes birak, sonra oturumu kapat.
    setTimeout(() => aktarimaDus(oturum, ws, sonuc.aktarim.sebep), 1200);
  }
}

async function aktarimaDus(oturum, ws, sebep) {
  try {
    if (oturum.callSid) {
      const hedef = config.numaralar.resepsiyon || config.numaralar.nobetci;
      if (hedef) await db.aktarimNiyetiYaz(oturum.callSid, hedef, sebep ?? 'aktarim');
    }
  } catch (err) {
    console.error('[relay] aktarim niyeti yazilamadi:', err.message);
  }
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: 'end', handoffData: JSON.stringify({ sebep }) }));
  }
}

module.exports = {
  YOL_GELEN,
  YOL_BITTI,
  YOL_RELAY,
  imzaDogrula,
  gelenCagri,
  relayBitti,
  relayKur,
};
