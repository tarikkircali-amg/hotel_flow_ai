'use strict';

// Anahtar yazma - PANODAN.
//
//   node scripts/anahtar-yaz.js anthropic
//   node scripts/anahtar-yaz.js eleven
//
// Anahtari saglayicinin sitesinde Copy ile kopyalayin, sonra bu komutu
// calistirin. Anahtar ekranda hic gorunmez, komut satirina yazilmaz,
// kabuk gecmisine dusmez. Yazildiktan sonra son 4 hanesiyle dogrulanir.
//
// Yazma adimi surekli takildigi icin var: tirnak, kodlama, kaydetmeyi
// unutma, kabuk degiskeni tasima gibi dertlerin hicbiri kalmiyor.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const KOK = path.resolve(__dirname, '..');
const ENV = path.join(KOK, '.env');
const ORNEK = path.join(KOK, '.env.example');

const yesil = (s) => `\x1b[32m${s}\x1b[0m`;
const kirmizi = (s) => `\x1b[31m${s}\x1b[0m`;
const sari = (s) => `\x1b[33m${s}\x1b[0m`;

const HEDEFLER = {
  anthropic: { degisken: 'ANTHROPIC_API_KEY', ad: 'Anthropic', onek: 'sk-ant-' },
  eleven: { degisken: 'ELEVENLABS_API_KEY', ad: 'ElevenLabs', onek: '' },
};

function kullanim() {
  console.log(`
  Kullanim:

    1. Anahtari saglayicinin sitesinde Copy dugmesiyle kopyalayin
    2. Sonra:

       node scripts/anahtar-yaz.js anthropic
       node scripts/anahtar-yaz.js eleven
`);
}

/** Panoyu okur. Windows'ta PowerShell, macOS'ta pbpaste, Linux'ta xclip. */
function panodanOku() {
  const denemeler =
    process.platform === 'win32'
      ? [['powershell', ['-NoProfile', '-Command', 'Get-Clipboard -Raw']]]
      : process.platform === 'darwin'
        ? [['pbpaste', []]]
        : [
            ['xclip', ['-selection', 'clipboard', '-o']],
            ['xsel', ['--clipboard', '--output']],
          ];

  for (const [komut, argv] of denemeler) {
    const sonuc = spawnSync(komut, argv, { encoding: 'utf8' });
    if (sonuc.status === 0 && typeof sonuc.stdout === 'string') return sonuc.stdout;
  }
  return null;
}

function envSatirlari() {
  if (fs.existsSync(ENV)) return fs.readFileSync(ENV, 'utf8').split(/\r?\n/);
  if (fs.existsSync(ORNEK)) {
    console.log(sari('  .env yoktu, .env.example temel alindi.'));
    return fs.readFileSync(ORNEK, 'utf8').split(/\r?\n/);
  }
  throw new Error('.env ve .env.example bulunamadi. Dogru klasorde misiniz?');
}

function satiriDegistir(satirlar, ad, deger) {
  let bulundu = false;
  const yeni = satirlar.map((s) => {
    if (s.startsWith(`${ad}=`)) {
      bulundu = true;
      return `${ad}=${deger}`;
    }
    return s;
  });
  if (!bulundu) yeni.push(`${ad}=${deger}`);
  return yeni;
}

function oku(satirlar, ad) {
  const s = satirlar.find((x) => x.startsWith(`${ad}=`));
  return s ? s.slice(ad.length + 1).trim() : '';
}

function sonDort(d) {
  return d ? `...${d.slice(-4)}` : kirmizi('bos');
}

/** --zorla verildiyse onek kontrolu atlanir (saglayici onek degistirirse). */
function zorla() {
  return process.argv.includes('--zorla');
}

/**
 * Panodaki metni sizdirmadan tarif eder: uzunluk + ilk 8 karakter.
 * Ilk 8 karakter anahtarlarda zaten herkese acik onek kismidir.
 */
function panoOzeti(metin) {
  const bas = metin.slice(0, 8);
  return `panodaki metin: "${bas}..." (${metin.length} karakter)`;
}

function anahtariDogrula(ham, hedef) {
  if (ham === null) {
    return { hata: 'Pano okunamadi. Anahtari kopyaladiginizdan emin olun.' };
  }

  const anahtar = String(ham).replace(/\s+/g, '');
  if (!anahtar) return { hata: 'Pano bos. Once anahtari Copy ile kopyalayin.' };
  if (anahtar.includes('...')) {
    return {
      hata:
        'Panodaki metinde "..." var - anahtarin maskelenmis hali kopyalanmis.\n' +
        '    Saglayici konsolundaki Copy dugmesini kullanin.',
    };
  }
  if (anahtar.length < 20) {
    return {
      hata: `Panodaki metin cok kisa. ${panoOzeti(anahtar)}\n    Anahtar degil gibi gorunuyor.`,
    };
  }
  if (anahtar.length > 300) {
    return { hata: 'Panodaki metin cok uzun. Anahtar yerine baska bir sey kopyalanmis.' };
  }
  if (hedef.onek && !anahtar.startsWith(hedef.onek) && !zorla()) {
    return {
      hata:
        `${hedef.ad} anahtari "${hedef.onek}" ile baslamali, panodaki metin baslamiyor.\n` +
        `    ${panoOzeti(anahtar)}\n` +
        '    Saglayici gercekten baska bir onek kullaniyorsa: --zorla ekleyin.',
    };
  }
  return { anahtar };
}

function main() {
  const secim = (process.argv[2] || '').toLowerCase();
  const hedef = HEDEFLER[secim];

  if (!hedef) {
    console.log(kirmizi('\n  Hangi anahtari yazacagimi belirtin.'));
    kullanim();
    process.exitCode = 1;
    return;
  }

  console.log(`\n  ${hedef.ad} anahtari panodan okunuyor...\n`);

  const { anahtar, hata } = anahtariDogrula(panodanOku(), hedef);
  if (hata) {
    console.log(kirmizi(`  ! ${hata}`));
    console.log('');
    process.exitCode = 1;
    return;
  }

  let satirlar = envSatirlari();
  const onceki = oku(satirlar, hedef.degisken);

  satirlar = satiriDegistir(satirlar, hedef.degisken, anahtar);

  // Demoda takilmamak icin bunu da garantiye aliyoruz.
  let demoAcildi = false;
  if (oku(satirlar, 'DEMO_MOD') !== 'true') {
    satirlar = satiriDegistir(satirlar, 'DEMO_MOD', 'true');
    demoAcildi = true;
  }

  fs.writeFileSync(ENV, satirlar.join('\n'), { encoding: 'utf8' });

  // Dosyadan TEKRAR okuyup dogruluyoruz - "yazdim sandim" olmasin.
  const kontrol = fs.readFileSync(ENV, 'utf8').split(/\r?\n/);
  const yazilan = oku(kontrol, hedef.degisken);

  if (yazilan !== anahtar) {
    console.log(kirmizi('  ! Yazma dogrulanamadi. Dosya yazma izni var mi?'));
    process.exitCode = 1;
    return;
  }

  console.log(`  ${yesil('YAZILDI')}`);
  console.log(`  onceki : ${sonDort(onceki)}`);
  console.log(`  simdi  : ${yesil(sonDort(yazilan))}   (${yazilan.length} karakter)`);
  if (demoAcildi) console.log(sari('  DEMO_MOD=true yapildi.'));

  console.log(sari('\n  Son 4 haneyi saglayici konsolundaki anahtarla karsilastirin.'));
  console.log('  Sonra:  node scripts/anahtar-kontrol.js\n');
}

try {
  main();
} catch (err) {
  console.error(kirmizi(`\n  Hata: ${err.message}\n`));
  process.exitCode = 1;
}
