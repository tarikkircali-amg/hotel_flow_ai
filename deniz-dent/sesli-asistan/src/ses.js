'use strict';

// ElevenLabs metin -> ses.
//
// Model: eleven_flash_v2_5 (~75ms, Turkce destekli, en dusuk gecikme).
// Ses:   varsayilan "Sevval - Call Center" - sesli asistanlar icin hazirlanmis
//        Turkce (Istanbul aksani) kadin sesi. .env ile degistirilebilir.
//
// Uretilen ses bellekte kisa sureligine tutulur ve bir kerelik URL ile sunulur;
// diske yazilmaz.

const crypto = require('node:crypto');
const config = require('./config');

const TABAN = 'https://api.elevenlabs.io/v1/text-to-speech';
const SAKLAMA_MS = 10 * 60 * 1000;

/** id -> { govde: Buffer, tur: string, biti: number } */
const kasa = new Map();

function temizle() {
  const simdi = Date.now();
  for (const [id, k] of kasa) if (k.biti < simdi) kasa.delete(id);
}
setInterval(temizle, 60_000).unref();

function acikMi() {
  return Boolean(config.ses.apiKey);
}

/**
 * Metni seslendirir ve tek kullanimlik bir URL yolu dondurur.
 * Anahtar yoksa veya hata olursa null doner - demo sessizce metinle devam eder.
 *
 * @param {string} metin
 * @returns {Promise<{yol: string, ms: number}|null>}
 */
async function seslendir(metin) {
  const temizMetin = String(metin ?? '').trim();
  if (!temizMetin || !acikMi()) return null;

  const baslangic = Date.now();
  const url =
    `${TABAN}/${encodeURIComponent(config.ses.voiceId)}/stream` +
    `?output_format=${encodeURIComponent(config.ses.format)}`;

  try {
    const yanit = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': config.ses.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: temizMetin,
        model_id: config.ses.model,
        language_code: 'tr',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
          speed: 1.0,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!yanit.ok) {
      const govde = await yanit.text().catch(() => '');
      console.error(`[ses] ElevenLabs ${yanit.status}: ${govde.slice(0, 300)}`);
      return null;
    }

    const govde = Buffer.from(await yanit.arrayBuffer());
    const id = crypto.randomBytes(12).toString('hex');
    kasa.set(id, {
      govde,
      tur: yanit.headers.get('content-type') || 'audio/mpeg',
      biti: Date.now() + SAKLAMA_MS,
    });

    return { yol: `/demo/ses/${id}`, ms: Date.now() - baslangic };
  } catch (err) {
    console.error('[ses] seslendirme basarisiz:', err.message);
    return null;
  }
}

function getir(id) {
  const k = kasa.get(id);
  if (!k || k.biti < Date.now()) return null;
  return k;
}

/**
 * Akan metni cumlelere boler.
 * Tam bir cumle olustugunda hemen seslendirilebilsin diye kullaniliyor -
 * yanitin tamamini beklemek yerine ilk cumleyi erken duyuruyoruz.
 */
class CumleToplayici {
  constructor() {
    this.tampon = '';
  }

  /** @returns {string[]} tamamlanmis cumleler */
  ekle(parca) {
    this.tampon += parca;
    const cikan = [];

    let kesim = this.#sonrakiKesim();
    while (kesim) {
      cikan.push(this.tampon.slice(0, kesim.son).trim());
      this.tampon = this.tampon.slice(kesim.devam);
      kesim = this.#sonrakiKesim();
    }
    return cikan;
  }

  /**
   * Tamponda gecerli bir cumle sonu arar.
   *
   * Cumle sonu sayilmasi icin noktalama isaretinden SONRA bosluk olmali -
   * bu "14.30" gibi saat ve ondalikli sayilari kendiliginden eler.
   * Ayrica elenenler:
   *   - cok kisa parcalar (12 karakterden az) : "Dt." tek basina cumle degil
   *   - kisaltmalar                           : "... Dt. Selin" bolunmemeli
   *   - sira sayilari                         : "2. seans" bolunmemeli
   *
   * @returns {{son: number, devam: number}|null} son = cumlenin bittigi indeks,
   *          devam = tamponda kalinacak indeks (bosluk atlanmis halde)
   */
  #sonrakiKesim() {
    const kalip = /[.!?…]+(\s+)/g;
    let m;
    while ((m = kalip.exec(this.tampon)) !== null) {
      const noktalamaSonu = m.index + (m[0].length - m[1].length);
      const aday = this.tampon.slice(0, noktalamaSonu).trim();

      if (aday.length < 12) continue;
      if (/\d\s*$/.test(this.tampon.slice(0, m.index))) continue; // "2. seans"
      if (this.#kisaltmaMi(aday)) continue; // "Dt." "Dr." "vb."

      return { son: noktalamaSonu, devam: m.index + m[0].length };
    }
    return null;
  }

  /** Noktadan onceki son kelime 3 harf veya kisaysa kisaltma sayilir. */
  #kisaltmaMi(aday) {
    const sonKelime = aday.replace(/[.!?…]+$/, '').split(/\s+/).pop() ?? '';
    return sonKelime.length > 0 && sonKelime.length <= 3;
  }

  /** Akis bitti: elde kalani ver. */
  bitir() {
    const kalan = this.tampon.trim();
    this.tampon = '';
    return kalan ? [kalan] : [];
  }
}

module.exports = { seslendir, getir, acikMi, CumleToplayici };
