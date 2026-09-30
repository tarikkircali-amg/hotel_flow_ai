'use strict';

// Tum yapilandirma tek yerden okunur. Kodun hicbir yerinde sabit deger yok.
// Eksik/hatali ayar varsa sunucu ACILMAZ - yarim calisan bir sesli asistan,
// calismayandan daha kotudur.

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const KOK = path.resolve(__dirname, '..');

function zorunlu(ad) {
  const deger = process.env[ad];
  if (!deger || !String(deger).trim()) {
    throw new Error(
      `Eksik ortam degiskeni: ${ad}. .env.example dosyasini .env olarak kopyalayip doldurun.`
    );
  }
  return String(deger).trim();
}

function istege(ad, varsayilan) {
  const deger = process.env[ad];
  return deger === undefined || deger === '' ? varsayilan : String(deger).trim();
}

function sayi(ad, varsayilan) {
  const ham = istege(ad, String(varsayilan));
  const n = Number(ham);
  if (!Number.isFinite(n)) throw new Error(`${ad} sayi olmali, gelen: ${ham}`);
  return n;
}

function mantik(ad, varsayilan) {
  return istege(ad, String(varsayilan)).toLowerCase() === 'true';
}

function telefonDogrula(ad, deger) {
  if (!deger) return null;
  if (!/^\+[1-9]\d{6,14}$/.test(deger)) {
    throw new Error(`${ad} E.164 formatinda olmali (ornek: +905321234567). Gelen: ${deger}`);
  }
  return deger;
}

function klinikYukle(gorecelYol) {
  const tamYol = path.isAbsolute(gorecelYol) ? gorecelYol : path.join(KOK, gorecelYol);
  if (!fs.existsSync(tamYol)) {
    throw new Error(
      `Klinik bilgi dosyasi bulunamadi: ${tamYol}\n` +
        `config/klinik.ornek.json dosyasini kopyalayip doldurun.`
    );
  }
  let veri;
  try {
    veri = JSON.parse(fs.readFileSync(tamYol, 'utf8'));
  } catch (err) {
    throw new Error(`Klinik bilgi dosyasi gecerli JSON degil (${tamYol}): ${err.message}`);
  }
  klinikDogrula(veri, tamYol);
  return veri;
}

function klinikDogrula(k, yol) {
  const eksik = [];
  if (!k.klinik?.ad) eksik.push('klinik.ad');
  if (!Array.isArray(k.mesai?.haftalik) || k.mesai.haftalik.length === 0) eksik.push('mesai.haftalik');
  if (!Array.isArray(k.hizmetler) || k.hizmetler.length === 0) eksik.push('hizmetler');
  if (!Array.isArray(k.acil?.anahtar_kelimeler) || k.acil.anahtar_kelimeler.length === 0) {
    eksik.push('acil.anahtar_kelimeler');
  }
  if (!k.acil?.yanit) eksik.push('acil.yanit');
  if (!k.karsilama?.mesai_disi) eksik.push('karsilama.mesai_disi');
  if (!k.fiyat_politikasi?.onaysiz_yanit) eksik.push('fiyat_politikasi.onaysiz_yanit');

  if (eksik.length) {
    throw new Error(`Klinik bilgi dosyasinda eksik alanlar (${yol}): ${eksik.join(', ')}`);
  }

  // Onayli isaretli ama bandi olmayan fiyat = sessiz uydurma riski. Aciktan hata ver.
  for (const f of k.fiyatlar ?? []) {
    if (f.onayli && (f.alt == null || f.ust == null)) {
      throw new Error(
        `Fiyat "${f.islem}" onayli isaretlenmis ama alt/ust bandi bos. ` +
          `Ya bandi doldurun ya onayli=false yapin.`
      );
    }
    if (f.onayli && Number(f.alt) > Number(f.ust)) {
      throw new Error(`Fiyat "${f.islem}" icin alt band ust banddan buyuk.`);
    }
  }
}

const klinikYolu = istege('KLINIK_CONFIG', 'config/klinik.json');

const config = {
  port: sayi('PORT', 3000),
  genelAdres: zorunlu('GENEL_ADRES').replace(/\/+$/, ''),

  db: {
    url: zorunlu('DATABASE_URL'),
    ssl: mantik('DB_SSL', false) ? { rejectUnauthorized: false } : false,
  },

  claude: {
    apiKey: zorunlu('ANTHROPIC_API_KEY'),
    model: istege('ASISTAN_MODEL', 'claude-opus-5-5'),
    effort: istege('ASISTAN_EFFORT', 'low'),
    maxTokens: sayi('ASISTAN_MAX_TOKENS', 800),
  },

  twilio: {
    authToken: zorunlu('TWILIO_AUTH_TOKEN'),
    dil: istege('SES_DILI', 'tr-TR'),
    ttsSaglayici: istege('TTS_SAGLAYICI', 'ElevenLabs'),
    ttsSes: istege('TTS_SES', ''),
  },

  numaralar: {
    nobetci: telefonDogrula('NOBETCI_NUMARA', istege('NOBETCI_NUMARA', '')),
    resepsiyon: telefonDogrula('RESEPSIYON_NUMARA', istege('RESEPSIYON_NUMARA', '')),
  },

  panel: {
    kullanici: istege('PANEL_KULLANICI', 'klinik'),
    parolaHash: zorunlu('PANEL_PAROLA_HASH'),
    oturumSaat: sayi('PANEL_OTURUM_SAAT', 12),
  },

  klinik: klinikYukle(klinikYolu),
  klinikYolu,
};

// Uyarilar: engelleyici degil ama gozden kacmamali.
const uyarilar = [];
if (!config.numaralar.nobetci) {
  uyarilar.push(
    'NOBETCI_NUMARA bos. Acil durumda asistan aktarim yapamaz, sadece sozlu yonlendirme verir.'
  );
}
if (!config.genelAdres.startsWith('https://')) {
  uyarilar.push('GENEL_ADRES https olmali - Twilio wss baglantisi icin sart.');
}
config.uyarilar = uyarilar;

module.exports = config;
module.exports.klinikYukle = klinikYukle;
module.exports.klinikDogrula = klinikDogrula;
