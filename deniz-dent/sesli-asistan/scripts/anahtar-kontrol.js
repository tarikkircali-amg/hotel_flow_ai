'use strict';

// Anahtar kontrolu.
//
//   node scripts/anahtar-kontrol.js
//
// .env dosyasini uygulamanin okudugu yoldan okur, anahtarlarin seklini
// (gizlemeden ozetler, degerini basmaz) ve gercekten calisip calismadigini
// soyler. Saglayicinin dondugu hata mesajini oldugu gibi gosterir -
// tahmin yurutmek yerine sebebi okuruz.
//
// Token harcamaz: Anthropic'te model listesi, ElevenLabs'te kullanici
// bilgisi ucu cagrilir.

const fs = require('node:fs');
const path = require('node:path');

// .env dosyasi ortam degiskenini ezsin (bkz. src/config.js'teki aciklama).
require('dotenv').config({ override: true });

/**
 * Kabukta/isletim sisteminde kalmis eski bir degisken, .env'i ezip
 * "guncelledim ama degismedi" tablosuna yol aciyordu. Artik ezmiyor ama
 * boyle bir catisma varsa kullaniciyi uyariyoruz - temizlemesi gerekir.
 */
function catismaUyar(ad) {
  const dosya = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(dosya)) return;

  const satir = fs
    .readFileSync(dosya, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${ad}=`));
  if (!satir) return;

  const dosyadaki = satir.slice(ad.length + 1).trim();
  const kullanilan = String(process.env[ad] ?? '').trim();
  if (!dosyadaki || !kullanilan || dosyadaki === kullanilan) return;

  console.log(kirmizi(`    ! .env dosyasindaki deger (...${dosyadaki.slice(-4)}) ile`));
  console.log(kirmizi(`      kullanilan deger (...${kullanilan.slice(-4)}) FARKLI.`));
  console.log(sari(`      Kabukta eski bir ${ad} kalmis olabilir. Temizlemek icin:`));
  console.log(sari(`      Remove-Item Env:\\${ad}  ve PowerShell'i kapatip acin.`));
}

const yesil = (s) => `\x1b[32m${s}\x1b[0m`;
const kirmizi = (s) => `\x1b[31m${s}\x1b[0m`;
const sari = (s) => `\x1b[33m${s}\x1b[0m`;

function sekilRaporu(ad, ham) {
  if (ham === undefined) {
    console.log(`  ${kirmizi('YOK')}  ${ad} satiri .env dosyasinda hic yok`);
    return null;
  }
  const deger = String(ham);
  const temiz = deger.trim();

  if (!temiz) {
    console.log(`  ${kirmizi('BOS')}  ${ad} tanimli ama degeri yok`);
    return null;
  }

  console.log(`  ${ad}`);
  console.log(`    uzunluk      : ${temiz.length}`);
  console.log(`    basi         : ${temiz.slice(0, 10)}...`);
  // Saglayici konsollari anahtarlari son 4 hanesiyle listeler.
  // .env'deki anahtarin konsolda gordugunuz anahtar olup olmadigini
  // buradan gozle karsilastirabilirsiniz. 4 hane sir sayilmaz.
  console.log(`    sonu         : ...${temiz.slice(-4)}`);

  const sorunlar = [];
  if (deger !== temiz) sorunlar.push('basinda/sonunda bosluk var');
  if (/\s/.test(temiz)) sorunlar.push('ICINDE BOSLUK VAR');
  if (/^["']|["']$/.test(temiz)) sorunlar.push('TIRNAK ICINDE - tirnaklari silin');
  if (temiz.includes('...')) sorunlar.push('UC NOKTA VAR - maskelenmis hali kopyalanmis');
  if (temiz.includes('\r')) sorunlar.push('satir sonu karakteri var');

  if (sorunlar.length) {
    for (const s of sorunlar) console.log(`    ${kirmizi('! ' + s)}`);
  } else {
    console.log(`    sekil        : ${yesil('temiz')}`);
  }
  return temiz;
}

async function anthropicDene(anahtar) {
  if (!anahtar) return;
  try {
    const yanit = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': anahtar, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(20_000),
    });

    if (yanit.ok) {
      const veri = await yanit.json();
      console.log(`    sonuc        : ${yesil('CALISIYOR')} (${veri.data?.length ?? 0} model goruldu)`);
      return;
    }

    const govde = await yanit.text();
    console.log(`    sonuc        : ${kirmizi('REDDEDILDI')} (HTTP ${yanit.status})`);
    console.log(`    saglayici der: ${govde.slice(0, 400)}`);

    if (yanit.status === 401) {
      console.log(sari('    -> Anahtar gecersiz veya silinmis. console.anthropic.com > Settings >'));
      console.log(sari('       API Keys adresinden YENI anahtar uretin ve Copy dugmesiyle kopyalayin.'));
    } else if (yanit.status === 400) {
      console.log(sari('    -> Istek bicimi reddedildi. Anahtar eksik veya bozuk gonderilmis olabilir.'));
    } else if (yanit.status === 429) {
      console.log(sari('    -> Anahtar gecerli ama kota/limit doldu.'));
    }
  } catch (err) {
    console.log(`    sonuc        : ${kirmizi('BAGLANILAMADI')} - ${err.message}`);
    console.log(sari('    -> Internet, guvenlik duvari veya kurumsal proxy engelliyor olabilir.'));
  }
}

async function elevenDene(anahtar) {
  if (!anahtar) return;

  // ASIL testi yapiyoruz: kisa bir metni seslendirmeyi deniyoruz.
  // Abonelik/kullanici uclari ayri izin ister; anahtar ses uretebiliyor olsa
  // bile oralardan "izin yok" doner ve yanlis alarm verir.
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'fnJjHAY6lhrGd5hWLRyU';
  const model = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5';

  try {
    const yanit = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: { 'xi-api-key': anahtar, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Merhaba.', model_id: model, language_code: 'tr' }),
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (yanit.ok) {
      const bayt = (await yanit.arrayBuffer()).byteLength;
      console.log(`    sonuc        : ${yesil('CALISIYOR')} (${bayt} baytlik ses uretildi)`);
      await kotaYaz(anahtar);
      return;
    }

    const govde = await yanit.text();
    console.log(`    sonuc        : ${kirmizi('SES URETILEMEDI')} (HTTP ${yanit.status})`);
    console.log(`    saglayici der: ${govde.slice(0, 400)}`);

    if (govde.includes('missing_permissions')) {
      console.log(sari('    -> Anahtar taniniyor ama ses uretme izni yok.'));
      console.log(sari('       ElevenLabs > profil > API Keys: anahtari duzenleyip'));
      console.log(sari('       "Text to Speech" iznini acin veya tam yetkili yeni anahtar uretin.'));
    } else if (yanit.status === 401) {
      console.log(sari('    -> Anahtar gecersiz. ElevenLabs profilinden yeni anahtar alin.'));
    } else if (yanit.status === 404) {
      console.log(sari(`    -> ${voiceId} sesi hesabinizda yok. ELEVENLABS_VOICE_ID degerini degistirin.`));
    } else if (yanit.status === 402 || govde.includes('paid_plan_required')) {
      console.log(sari('    -> Bu ses ElevenLabs kutuphanesinden ve ucretsiz hesaplar'));
      console.log(sari('       kutuphane seslerini API uzerinden kullanamiyor. Iki secenek:'));
      console.log(sari('       1) ElevenLabs aboneligini yukseltin (Turkce klinik sesi icin onerilen)'));
      console.log(sari('       2) Kendi hesabinizdaki bir sesi kullanin:'));
      console.log(sari('          .env > ELEVENLABS_VOICE_ID degerini degistirin'));
    } else if (yanit.status === 429) {
      console.log(sari('    -> Kota doldu veya istek limiti asildi.'));
    }
  } catch (err) {
    console.log(`    sonuc        : ${kirmizi('BAGLANILAMADI')} - ${err.message}`);
  }
}

/** Kota bilgisi ek bilgi; izin yoksa sorun degil, sessizce geciyoruz. */
async function kotaYaz(anahtar) {
  try {
    const y = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': anahtar },
      signal: AbortSignal.timeout(15_000),
    });
    if (!y.ok) return;
    const v = await y.json();
    const kalan = (v.character_limit ?? 0) - (v.character_count ?? 0);
    console.log(`    kalan kota   : ${kalan} karakter`);
    if (kalan <= 0) console.log(sari('    -> Kota bitmis, demoda ses cikmaz.'));
  } catch {
    /* kota okunamadi - onemli degil */
  }
}

(async () => {
  console.log('\n  ANAHTAR KONTROLU  (degerler ekrana basilmaz)\n');

  console.log('  --- Anthropic (asistanin beyni - ZORUNLU) ---');
  const ant = sekilRaporu('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY);
  catismaUyar('ANTHROPIC_API_KEY');
  await anthropicDene(ant);

  console.log('\n  --- ElevenLabs (ses - istege bagli) ---');
  console.log('  (kisa bir metin seslendirilerek gercek test yapilir)');
  const ele = sekilRaporu('ELEVENLABS_API_KEY', process.env.ELEVENLABS_API_KEY);
  catismaUyar('ELEVENLABS_API_KEY');
  await elevenDene(ele);

  console.log('\n  --- Diger ayarlar ---');
  console.log(`  DEMO_MOD       : ${process.env.DEMO_MOD ?? '(yok)'}`);
  console.log(`  PORT           : ${process.env.PORT ?? '(yok, 3000 kullanilir)'}`);
  console.log(`  ASISTAN_MODEL  : ${process.env.ASISTAN_MODEL ?? '(yok, varsayilan)'}`);
  console.log('');
})();
