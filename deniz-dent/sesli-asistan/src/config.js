'use strict';

// Tum yapilandirma tek yerden okunur. Kodun hicbir yerinde sabit deger yok.
// Eksik/hatali ayar varsa sunucu ACILMAZ - yarim calisan bir sesli asistan,
// calismayandan daha kotudur.

// override: true -> .env dosyasi, kabuk/isletim sisteminde kalmis eski
// ortam degiskenlerini ezer. Varsayilan davranis tam tersi ve sinsi bir
// tuzak: .env'i guncellersiniz ama uygulama eski degeri kullanmaya devam eder.
// Sunucuda .env dosyasi olmadigi icin orada ortam degiskenleri gecerli kalir.
require('dotenv').config({ override: true });

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

/** Goreceli yollar proje kokune gore cozulur; mutlak yollar oldugu gibi kullanilir. */
function tamYol(yol) {
  return path.isAbsolute(yol) ? yol : path.join(KOK, yol);
}

function klinikYukle(gorecelYol) {
  const tam = tamYol(gorecelYol);
  if (!fs.existsSync(tam)) {
    throw new Error(
      `Klinik bilgi dosyasi bulunamadi: ${tam}\n` +
        `config/klinik.ornek.json dosyasini kopyalayip doldurun.`
    );
  }
  let veri;
  try {
    veri = JSON.parse(fs.readFileSync(tam, 'utf8'));
  } catch (err) {
    throw new Error(`Klinik bilgi dosyasi gecerli JSON degil (${tam}): ${err.message}`);
  }
  klinikDogrula(veri, tam);
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

const demoMod = mantik('DEMO_MOD', false);

// Demo modunda Twilio, Postgres ve panel parolasi gerekmez - amac tek komutla
// ayaga kalkip sesi duyurmak. Uretimde hepsi zorunlu.
const gerekli = (ad) => (demoMod ? istege(ad, '') : zorunlu(ad));

function klinikYoluSec() {
  const varsayilan = demoMod ? 'config/klinik.demo.json' : 'config/klinik.json';
  const secilen = istege('KLINIK_CONFIG', varsayilan);

  // Demo modunda, elle verilen dosya yoksa demo dosyasina duseriz.
  // Aksi halde .env'de kalmis bir KLINIK_CONFIG satiri demoyu acilmaz hale getiriyor.
  if (demoMod && !fs.existsSync(tamYol(secilen))) {
    const yedek = 'config/klinik.demo.json';
    if (fs.existsSync(tamYol(yedek))) {
      if (secilen !== yedek) {
        console.warn(`[config] ${secilen} bulunamadi, demo dosyasina duruldu: ${yedek}`);
      }
      return yedek;
    }
  }
  return secilen;
}

const klinikYolu = klinikYoluSec();

const config = {
  port: sayi('PORT', 3000),
  demoMod,
  genelAdres: (demoMod ? istege('GENEL_ADRES', `http://localhost:${sayi('PORT', 3000)}`) : zorunlu('GENEL_ADRES')).replace(/\/+$/, ''),

  db: {
    url: gerekli('DATABASE_URL'),
    ssl: mantik('DB_SSL', false) ? { rejectUnauthorized: false } : false,
  },

  claude: {
    apiKey: istege('ANTHROPIC_API_KEY', ''),
    model: istege('ASISTAN_MODEL', 'claude-opus-5-5'),
    effort: istege('ASISTAN_EFFORT', 'low'),
    maxTokens: sayi('ASISTAN_MAX_TOKENS', 800),
  },

  twilio: {
    authToken: gerekli('TWILIO_AUTH_TOKEN'),
    dil: istege('SES_DILI', 'tr-TR'),
    ttsSaglayici: istege('TTS_SAGLAYICI', 'ElevenLabs'),
    ttsSes: istege('TTS_SES', ''),
  },

  // Bu kurulumun hangi klinige (kiraciya) ait oldugu. Veritabanindaki
  // her satir bu kimlige baglanir ve RLS bu kimlikle filtreler.
  // Demo disinda zorunlu: yanlis/eksik kiraci kimligi, klinik verilerinin
  // birbirine karismasi demektir.
  kiraciId: demoMod
    ? istege('KIRACI_ID', '00000000-0000-4000-8000-000000000001')
    : zorunlu('KIRACI_ID'),

  sms: {
    // Bos birakilirsa SMS ozelligi KAPALI sayilir ve asistan
    // "SMS gonderebilirim" sozunu vermez. Tutamayacagimiz sozu
    // hastaya hic verdirmemek, sonradan ozur dilemekten iyidir.
    hesapSid: istege('TWILIO_ACCOUNT_SID', ''),
    authToken: istege('TWILIO_AUTH_TOKEN', ''),
    gonderenNo: telefonDogrula('SMS_GONDEREN_NO', istege('SMS_GONDEREN_NO', '')),
  },

  gizlilik: {
    // Hasta token'i bu tuzla uretilir. Tuz degisirse eski token'lar
    // yeni token'larla eslesmez - bu yuzden uretimde SABIT kalmali ve
    // sir olarak saklanmali. Demo disinda zorunlu.
    tokenTuzu: demoMod
      ? istege('TOKEN_TUZU', 'demo-tuzu-uretimde-kullanmayin')
      : zorunlu('TOKEN_TUZU'),
  },

  ses: {
    apiKey: istege('ELEVENLABS_API_KEY', ''),
    // "Sevval - Call Center" - sesli asistanlar icin hazirlanmis Turkce ses.
    voiceId: istege('ELEVENLABS_VOICE_ID', 'fnJjHAY6lhrGd5hWLRyU'),
    // flash_v2_5 Turkce destekliyor ve en dusuk gecikmeli model.
    model: istege('ELEVENLABS_MODEL', 'eleven_flash_v2_5'),
    format: istege('ELEVENLABS_FORMAT', 'mp3_22050_32'),
  },

  numaralar: {
    nobetci: telefonDogrula('NOBETCI_NUMARA', istege('NOBETCI_NUMARA', '')),
    resepsiyon: telefonDogrula('RESEPSIYON_NUMARA', istege('RESEPSIYON_NUMARA', '')),
  },

  panel: {
    kullanici: istege('PANEL_KULLANICI', 'klinik'),
    parolaHash: gerekli('PANEL_PAROLA_HASH'),
    oturumSaat: sayi('PANEL_OTURUM_SAAT', 12),
  },

  klinik: klinikYukle(klinikYolu),
  klinikYolu,
};

// Uyarilar: engelleyici degil ama gozden kacmamali.
const uyarilar = [];
if (!config.numaralar.nobetci && !demoMod) {
  uyarilar.push(
    'NOBETCI_NUMARA bos. Acil durumda asistan aktarim yapamaz, sadece sozlu yonlendirme verir.'
  );
}
if (!demoMod && !config.genelAdres.startsWith('https://')) {
  uyarilar.push('GENEL_ADRES https olmali - Twilio wss baglantisi icin sart.');
}
if (!config.claude.apiKey) {
  uyarilar.push(
    'ANTHROPIC_API_KEY yok - asistan cevap uretemez. Anahtari .env dosyasina ekleyin.'
  );
}
if (demoMod) {
  uyarilar.push('DEMO MODU acik: veriler bellekte tutuluyor, surec kapaninca silinir.');
  if (!config.ses.apiKey) {
    uyarilar.push('ELEVENLABS_API_KEY yok - demo calisir ama ses cikmaz, sadece metin gorunur.');
  }
}
config.uyarilar = uyarilar;

module.exports = config;
module.exports.klinikYukle = klinikYukle;
module.exports.klinikDogrula = klinikDogrula;
