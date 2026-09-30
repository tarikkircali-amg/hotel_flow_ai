'use strict';

const express = require('express');
const http = require('node:http');
const crypto = require('node:crypto');

const config = require('./config');
const db = require('./db');
const panel = require('./panel');
const tw = require('./twilio');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Railway/Hetzner arkasinda dogru IP icin

// Twilio form-encoded gonderir; imza dogrulamasi ham govdeye degil
// ayristirilmis alanlara bakar, bu yuzden parser imzadan once gelir.
app.use(express.urlencoded({ extended: false }));

// --- Saglik kontrolu (kimlik istemez) ---
app.get('/saglik', async (_req, res) => {
  try {
    await db.sorgu('SELECT 1');
    res.json({ durum: 'ok', demo: config.demoMod, zaman: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ durum: 'veritabani-yok', hata: err.message });
  }
});

// --- Twilio uclari ---
app.post(tw.YOL_GELEN, tw.imzaDogrula, tw.gelenCagri);
app.post(tw.YOL_BITTI, tw.imzaDogrula, tw.relayBitti);

// --- Demo (yalnizca DEMO_MOD acikken) ---
let demo = null;
if (config.demoMod) {
  demo = require('./demo');
  app.use('/demo', demo.yonlendirici());
}

// --- Panel ---
app.use('/panel', panel.yonlendirici());

app.get('/', (_req, res) => res.redirect(config.demoMod ? '/demo/' : '/panel/'));

// --- Hata zarfi ---
// Ic detay disari sizmaz; referans numarasi ile log'a baglanir.
app.use((err, req, res, _next) => {
  const referans = crypto.randomUUID();
  console.error(`[hata ${referans}]`, err);
  res.status(500).json({
    hata: {
      kod: 'SUNUCU_HATASI',
      mesaj: 'İşlem tamamlanamadı. Sorun devam ederse bu numarayı iletin.',
      referans,
    },
  });
});

const sunucu = http.createServer(app);

// --- WebSocket yonlendirmesi (tek elden) ---
const wsYollari = new Map();
const relay = tw.relayKur();
wsYollari.set(relay.yol, relay.upgrade);
if (demo) {
  const demoWs = demo.wsKur();
  wsYollari.set(demoWs.yol, demoWs.upgrade);
}

sunucu.on('upgrade', (req, socket, head) => {
  let yol;
  try {
    yol = new URL(req.url, 'http://x').pathname;
  } catch {
    socket.destroy();
    return;
  }
  const isle = wsYollari.get(yol);
  if (!isle) {
    socket.destroy();
    return;
  }
  isle(req, socket, head);
});

sunucu.listen(config.port, () => {
  console.log('');
  console.log(`  ${config.klinik.klinik.ad} - sesli asistan`);
  console.log(`  dinleniyor      : http://localhost:${config.port}`);
  console.log(`  model           : ${config.claude.model} (effort: ${config.claude.effort})`);
  console.log(`  klinik dosyasi  : ${config.klinikYolu}`);

  if (config.demoMod) {
    console.log('');
    console.log('  ┌──────────────────────────────────────────────┐');
    console.log(`  │  DEMO:  http://localhost:${String(config.port).padEnd(20)}│`);
    console.log('  └──────────────────────────────────────────────┘');
    console.log(`  ses             : ${config.ses.apiKey ? config.ses.model : 'KAPALI (anahtar yok)'}`);
    if (config.ses.apiKey) console.log(`  ses kimligi     : ${config.ses.voiceId}`);
  } else {
    console.log(`  genel adres     : ${config.genelAdres}`);
    console.log(`  ses dili        : ${config.twilio.dil} / ${config.twilio.ttsSaglayici}`);
    console.log('');
    console.log('  Twilio numara ayari:');
    console.log(`    A CALL COMES IN -> Webhook (HTTP POST) -> ${config.genelAdres}${tw.YOL_GELEN}`);
  }

  console.log('');
  for (const u of config.uyarilar) console.warn(`  ! UYARI: ${u}`);

  const onaysiz = (config.klinik.fiyatlar ?? []).filter((f) => !f.onayli).length;
  if (onaysiz > 0) {
    console.warn(
      `  ! ${onaysiz} islem icin fiyat onayi yok - asistan bunlarda rakam soylemeyecek.`
    );
  }
  console.log('');
});

// Bosta duran oturum ve aktarim kayitlarini saatte bir temizle.
const temizlik = setInterval(() => {
  db.suresiGecenOturumlariSil().catch((err) =>
    console.error('[temizlik] basarisiz:', err.message)
  );
}, 3600_000);
temizlik.unref();

function kapat(sinyal) {
  console.log(`\n${sinyal} alindi, kapaniyor...`);
  sunucu.close(() => {
    db.havuz.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => kapat('SIGTERM'));
process.on('SIGINT', () => kapat('SIGINT'));
