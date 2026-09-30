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
    res.json({ durum: 'ok', zaman: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ durum: 'veritabani-yok', hata: err.message });
  }
});

// --- Twilio uclari ---
app.post(tw.YOL_GELEN, tw.imzaDogrula, tw.gelenCagri);
app.post(tw.YOL_BITTI, tw.imzaDogrula, tw.relayBitti);

// --- Panel ---
app.use('/panel', panel.yonlendirici());

app.get('/', (_req, res) => res.redirect('/panel/'));

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
tw.relayKur(sunucu);

sunucu.listen(config.port, () => {
  console.log('');
  console.log(`  ${config.klinik.klinik.ad} - sesli asistan`);
  console.log(`  dinleniyor      : http://localhost:${config.port}`);
  console.log(`  genel adres     : ${config.genelAdres}`);
  console.log(`  model           : ${config.claude.model} (effort: ${config.claude.effort})`);
  console.log(`  ses dili        : ${config.twilio.dil} / ${config.twilio.ttsSaglayici}`);
  console.log(`  klinik dosyasi  : ${config.klinikYolu}`);
  console.log('');
  console.log('  Twilio numara ayari:');
  console.log(`    A CALL COMES IN -> Webhook (HTTP POST) -> ${config.genelAdres}${tw.YOL_GELEN}`);
  console.log('');
  for (const u of config.uyarilar) console.warn(`  ! UYARI: ${u}`);

  const onaysiz = (config.klinik.fiyatlar ?? []).filter((f) => !f.onayli).length;
  if (onaysiz > 0) {
    console.warn(
      `  ! ${onaysiz} islem icin fiyat onayi yok - asistan bunlarda rakam soylemeyecek.`
    );
  }
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
