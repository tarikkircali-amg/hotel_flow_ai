'use strict';

// WHATSAPP KANALI (Meta Cloud API)
//
// Gorusme mantigi telefonla AYNI: acil tarama -> gizlilik duvari ->
// zorunlu aktarim -> model. Bu modul yalnizca kanal farkliliklariyla
// ilgilenir; Gorusme sinifi WhatsApp'i bilmez.
//
// Kanal farkliliklari:
//   * Ses yok, tus (DTMF) yok. Karsilamada tus teklifi yapilmaz.
//   * Mesajlar kalicidir: hasta yarin geri donup ayni konusmaya devam edebilir.
//   * Meta ayni mesaji BIRDEN FAZLA kez gonderebilir (yeniden deneme).
//     Tekrarlari id ile eliyoruz; yoksa hasta ayni cevabi iki kez alir ve
//     daha kotusu, ayni randevu talebi iki kere kuyruga duser.
//   * Metin disi mesajlar (ses notu, fotograf, konum) islenmez - sabit bir
//     cevapla insana aktarilir. Rontgen fotografini modele gondermek
//     spesifikasyon §5'in acikca yasakladigi sey.

const crypto = require('node:crypto');
const express = require('express');

const config = require('./config');
const db = require('./db');
const { Gorusme } = require('./ajan');
const { mesaiIcinde } = require('./klinik');

const YOL = '/whatsapp/webhook';

// Oturum: ayni numaradan gelen mesajlar ayni gorusmeye baglanir.
// Bellekte tutuluyor; surec yeniden baslarsa gorusme sifirlanir ve
// hasta yeni karsilama alir. Kabul edilebilir: yazili kanalda gecmis
// zaten ekranda duruyor.
const oturumlar = new Map();
const OTURUM_OMRU_MS = 6 * 60 * 60 * 1000; // 6 saat sessizlikten sonra yeni gorusme

// Islenmis mesaj kimlikleri - Meta'nin tekrar gonderimlerine karsi.
const islenenler = new Map();
const TEKRAR_PENCERESI_MS = 30 * 60 * 1000;

/**
 * Meta webhook dogrulamasi (kurulumda bir kez).
 * Token eslesmezse 403 - dogrulama ucunu acik birakmiyoruz.
 */
function dogrulama(req, res) {
  const mod = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const meydan = req.query['hub.challenge'];

  if (mod === 'subscribe' && token && token === config.whatsapp.dogrulamaToken) {
    return res.status(200).send(String(meydan ?? ''));
  }
  console.warn('[whatsapp] webhook dogrulamasi reddedildi');
  return res.sendStatus(403);
}

/**
 * Ham govdeyi saklayan JSON ayristirici.
 * Imza HAM govdeye gore hesaplaniyor; ayristirilmis nesneyi tekrar
 * JSON'a cevirmek bosluk/sira farki yuzunden imzayi bozar.
 */
const govdeYakala = express.json({
  limit: '1mb',
  verify: (req, _res, govde) => {
    req.hamGovde = govde;
  },
});

/** HMAC-SHA256, sabit zamanli karsilastirma. */
function imzaGecerli(hamGovde, baslik, sir) {
  if (!sir || !baslik || !hamGovde) return false;
  if (!baslik.startsWith('sha256=')) return false;

  const beklenen = crypto.createHmac('sha256', sir).update(hamGovde).digest('hex');
  const gelen = baslik.slice('sha256='.length);

  // Uzunluklar farkliysa timingSafeEqual hata atar.
  if (gelen.length !== beklenen.length) return false;
  return crypto.timingSafeEqual(Buffer.from(gelen, 'utf8'), Buffer.from(beklenen, 'utf8'));
}

function imzaDogrula(req, res, next) {
  if (!imzaGecerli(req.hamGovde, req.get('X-Hub-Signature-256'), config.whatsapp.appSecret)) {
    console.warn('[whatsapp] gecersiz imza, istek reddedildi');
    return res.sendStatus(403);
  }
  return next();
}

/**
 * Webhook govdesinden mesajlari cikarir.
 * Meta ic ice ve degisken bir yapi gonderiyor; eksik alanlarda patlamak
 * yerine o kaydi atliyoruz.
 */
function mesajlariCikar(govde) {
  const cikti = [];
  for (const girdi of govde?.entry ?? []) {
    for (const degisiklik of girdi?.changes ?? []) {
      const deger = degisiklik?.value;
      const telefonId = deger?.metadata?.phone_number_id ?? null;
      for (const m of deger?.messages ?? []) {
        if (!m?.id || !m?.from) continue;
        cikti.push({
          id: m.id,
          gonderen: m.from,
          tur: m.type,
          metin: m.type === 'text' ? (m.text?.body ?? '') : null,
          telefonId,
        });
      }
    }
  }
  return cikti;
}

/** Tekrar gonderim mi? Ayni id ikinci kez geldiyse islemiyoruz. */
function tekrarMi(id) {
  const simdi = Date.now();
  for (const [k, t] of islenenler) {
    if (simdi - t > TEKRAR_PENCERESI_MS) islenenler.delete(k);
  }
  if (islenenler.has(id)) return true;
  islenenler.set(id, simdi);
  return false;
}

/** Mesaj gonderir. Basarisizlik cagriyi dusurmez ama sessiz de kalmaz. */
async function gonder(numara, metin) {
  const w = config.whatsapp;
  if (!w.erisimToken || !w.telefonId) {
    console.warn('[whatsapp] gonderim yapilandirilmamis, mesaj gonderilemedi');
    return false;
  }

  try {
    const yanit = await fetch(`https://graph.facebook.com/${w.apiSurum}/${w.telefonId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${w.erisimToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: numara,
        type: 'text',
        text: { body: metin },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (yanit.ok) return true;

    const hata = await yanit.text();
    console.error(`[whatsapp] gonderilemedi (HTTP ${yanit.status}): ${hata.slice(0, 250)}`);
    return false;
  } catch (err) {
    console.error('[whatsapp] gonderilemedi:', err.message);
    return false;
  }
}

/** Numaraya ait gorusmeyi getirir, yoksa acar. */
async function oturumAl(numara) {
  const mevcut = oturumlar.get(numara);
  if (mevcut && Date.now() - mevcut.sonHareket < OTURUM_OMRU_MS) {
    mevcut.sonHareket = Date.now();
    return { oturum: mevcut, yeni: false };
  }

  const callSid = `WA${crypto.randomBytes(10).toString('hex')}`;
  const arama = await db.aramaBaslat({
    callSid,
    kanal: 'whatsapp',
    arayanNo: numara,
    arananNo: config.whatsapp.telefonId ?? null,
    dil: 'tr-TR',
    // Asistan WhatsApp'ta 7/24 karsiliyor, ama kayit GERCEGI yazmali:
    // panel ve sabah kuyrugu "mesai disinda mi geldi" diye ayiriyor.
    mesaiDisi: !mesaiIcinde(config.klinik),
  });

  await db.rizaKaydet({
    aramaId: arama.id,
    telefon: numara,
    kanal: 'whatsapp',
    metinVersiyonu: config.klinik.kvkk?.metin_versiyonu ?? 'v0',
  });

  const gecmis = await db.gecmisGorusmeler(numara, arama.id).catch(() => []);

  const oturum = {
    sonHareket: Date.now(),
    aramaId: arama.id,
    gorusme: new Gorusme({
      klinik: config.klinik,
      aramaId: arama.id,
      callSid,
      arayanNo: numara,
      gecmis,
      kanal: 'whatsapp',
    }),
  };
  oturumlar.set(numara, oturum);
  return { oturum, yeni: true };
}

/** Bir mesaji bastan sona isler. */
async function mesajIsle(mesaj) {
  const { oturum, yeni } = await oturumAl(mesaj.gonderen);

  // Ilk mesajda karsilama + KVKK bildirimi gonderiliyor.
  if (yeni) {
    const karsilama = oturum.gorusme.karsilama();
    await db.mesajEkle(oturum.aramaId, 'sistem', `Karşılama: ${karsilama}`);
    await gonder(mesaj.gonderen, karsilama);
  }

  if (mesaj.tur !== 'text' || !mesaj.metin?.trim()) {
    // Metin disi icerik modele GITMEZ. Rontgen/fotograf gondermek
    // spesifikasyon §5'in yasakladigi sey; ses notu da cozumlenmez.
    const cevap =
      config.klinik.whatsapp?.metin_disi_yanit ??
      'Şu anda yalnızca yazılı mesajları değerlendirebiliyorum. ' +
        'Gönderdiğinizi klinik ekibimize iletiyorum, en kısa sürede dönüş yapılacak.';

    await db.denetim({
      aktor: 'sistem',
      eylem: 'whatsapp_metin_disi',
      kaynak: 'arama',
      kaynakId: oturum.aramaId,
      detay: { tur: mesaj.tur },
      sonuc: 'insana_aktarildi',
    });

    await gonder(mesaj.gonderen, cevap);
    return;
  }

  // Buradan sonrasi telefonla AYNI boru hatti.
  let toplam = '';
  const sonuc = await oturum.gorusme.yanitla(mesaj.metin, (parca) => {
    toplam += parca;
  });

  const cevap = (sonuc?.tamMetin || toplam).trim();
  if (cevap) await gonder(mesaj.gonderen, cevap);
}

/**
 * Gelen webhook.
 *
 * Meta 20 saniye icinde 200 bekliyor; gecikirse ayni mesaji tekrar
 * gonderiyor. Bu yuzden ONCE 200 donup isi arkada yapiyoruz.
 */
function gelenMesaj(req, res) {
  res.sendStatus(200);

  const mesajlar = mesajlariCikar(req.body);
  for (const m of mesajlar) {
    if (tekrarMi(m.id)) {
      console.log(`[whatsapp] tekrar gonderim atlandi: ${m.id.slice(-8)}`);
      continue;
    }
    mesajIsle(m).catch((err) => {
      // Hata NESNESI basilmaz: icinde hasta metni tasiyabilir (§11).
      console.error('[whatsapp] mesaj islenemedi:', err.message);
    });
  }
}

function yonlendirici() {
  const r = express.Router();
  r.get('/webhook', dogrulama);
  r.post('/webhook', govdeYakala, imzaDogrula, gelenMesaj);
  return r;
}

/** Yapilandirma tam mi? Eksikse kanal acilmaz. */
function aktifMi() {
  const w = config.whatsapp;
  return Boolean(w.dogrulamaToken && w.appSecret && w.erisimToken && w.telefonId);
}

module.exports = {
  YOL,
  yonlendirici,
  aktifMi,
  // test icin
  imzaGecerli,
  mesajlariCikar,
  tekrarMi,
  _oturumlar: oturumlar,
  _islenenler: islenenler,
};
