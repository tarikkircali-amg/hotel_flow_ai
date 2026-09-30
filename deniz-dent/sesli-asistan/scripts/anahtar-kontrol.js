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

require('dotenv').config();

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
  try {
    const yanit = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': anahtar },
      signal: AbortSignal.timeout(20_000),
    });

    if (yanit.ok) {
      const v = await yanit.json();
      const kalan = (v.character_limit ?? 0) - (v.character_count ?? 0);
      console.log(`    sonuc        : ${yesil('CALISIYOR')} (kalan karakter: ${kalan})`);
      if (kalan <= 0) console.log(sari('    -> Karakter kotasi bitmis, ses uretilemez.'));
      return;
    }

    const govde = await yanit.text();
    console.log(`    sonuc        : ${kirmizi('REDDEDILDI')} (HTTP ${yanit.status})`);
    console.log(`    saglayici der: ${govde.slice(0, 300)}`);
  } catch (err) {
    console.log(`    sonuc        : ${kirmizi('BAGLANILAMADI')} - ${err.message}`);
  }
}

(async () => {
  console.log('\n  ANAHTAR KONTROLU  (degerler ekrana basilmaz)\n');

  console.log('  --- Anthropic (asistanin beyni - ZORUNLU) ---');
  const ant = sekilRaporu('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY);
  await anthropicDene(ant);

  console.log('\n  --- ElevenLabs (ses - istege bagli) ---');
  const ele = sekilRaporu('ELEVENLABS_API_KEY', process.env.ELEVENLABS_API_KEY);
  await elevenDene(ele);

  console.log('\n  --- Diger ayarlar ---');
  console.log(`  DEMO_MOD       : ${process.env.DEMO_MOD ?? '(yok)'}`);
  console.log(`  PORT           : ${process.env.PORT ?? '(yok, 3000 kullanilir)'}`);
  console.log(`  ASISTAN_MODEL  : ${process.env.ASISTAN_MODEL ?? '(yok, varsayilan)'}`);
  console.log('');
})();
