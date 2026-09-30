'use strict';

// KVKK KARSILAMA DEMOSU
//
//   node scripts/demo-kvkk.js               kendi sunucusunu baslatir (TEK KOMUT)
//   node scripts/demo-kvkk.js --dis-sunucu  zaten calisan sunucuya baglanir
//
// Varsayilan olarak kendi sunucusunu bos bir portta baslatip is bitince
// kapatir. Sebep: sunumda iki ayri terminal penceresi takip etmek zorunda
// kalmak, gosterilecek seyin onune geciyor.
//
// Calisan sunucuya gercek bir WebSocket baglantisi kurar, gorusmeyi
// bastan sonra yurutur ve ciktilari yazar.
//
// ANTHROPIC ANAHTARI GEREKTIRMEZ. Gosterdigi uc yol da modelden
// bagimsiz calisir - zaten bilerek oyle tasarlandi:
//   1. Karsilama + KVKK bilgilendirmesi (yapilandirmadan kurulur)
//   2. Acil tarama (LLM'den once)
//   3. Zorunlu insana aktarim (LLM'den once)
//
// Sunucuyu ayri bir terminalde calistirin:
//   DEMO_MOD=true PORT=8787 npm start

const WebSocket = require('ws');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const DIS_SUNUCU = process.argv.includes('--dis-sunucu');

/** Isletim sisteminden bos bir port ister - sabit port catismasi olmasin. */
function bosPort() {
  return new Promise((coz, redet) => {
    const s = net.createServer();
    s.once('error', redet);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => coz(port));
    });
  });
}

/**
 * Sunucuyu alt surec olarak baslatir ve "dinleniyor" satirini bekler.
 * Cikti yutulmaz; sunucu acilamazsa sebebi ekrana basilir.
 */
function sunucuBaslat(port) {
  return new Promise((coz, redet) => {
    const surec = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'index.js')], {
      env: { ...process.env, DEMO_MOD: 'true', PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let birikim = '';
    const zamanAsimi = setTimeout(() => {
      surec.kill();
      redet(new Error(`Sunucu 20 saniyede acilmadi. Ciktisi:\n${birikim.slice(-1500)}`));
    }, 20_000);

    surec.stdout.on('data', (d) => {
      birikim += d.toString();

      // Portu TAHMIN ETMIYORUZ, sunucunun soyledigini okuyoruz.
      // config.js .env dosyasini ortam degiskenlerine tercih ediyor
      // (dotenv override: true). Dolayisiyla .env icinde PORT varsa
      // sunucu bizim verdigimiz portta DEGIL, oradaki portta aciliyor.
      const m = birikim.match(/dinleniyor\s*:\s*https?:\/\/[^:]+:(\d+)/);
      if (m) {
        clearTimeout(zamanAsimi);
        coz({ surec, port: Number(m[1]) });
      }
    });
    surec.stderr.on('data', (d) => {
      birikim += d.toString();
    });

    surec.once('exit', (kod) => {
      clearTimeout(zamanAsimi);

      // Port doluysa buyuk ihtimalle ZATEN bizim sunucumuz calisiyordur.
      // Hata verip kullaniciyi surec avina gondermek yerine ona baglaniyoruz.
      const dolu = birikim.match(/EADDRINUSE.*?:(\d+)/);
      if (dolu) {
        coz({ surec: null, port: Number(dolu[1]), zatenCalisiyor: true });
        return;
      }

      redet(new Error(`Sunucu kapandi (kod ${kod}). Ciktisi:\n${birikim.slice(-1500)}`));
    });
  });
}

const mavi = (s) => `\x1b[36m${s}\x1b[0m`;
const yesil = (s) => `\x1b[32m${s}\x1b[0m`;
const sari = (s) => `\x1b[33m${s}\x1b[0m`;
const kirmizi = (s) => `\x1b[31m${s}\x1b[0m`;
const soluk = (s) => `\x1b[90m${s}\x1b[0m`;

const SENARYO = [
  { soz: 'Merhaba, dis etimde kanama var ve durmuyor', beklenen: 'ACIL' },
  { soz: 'Tedaviden memnun degilim, sikayetci olacagim', beklenen: 'ZORUNLU AKTARIM' },
  { soz: 'Kisisel verilerimi silmenizi istiyorum', beklenen: 'ZORUNLU AKTARIM (KVKK)' },
];

const bekle = (ms) => new Promise((c) => setTimeout(c, ms));

function sar(metin, genislik = 76, girinti = '  ') {
  const kelimeler = String(metin).split(/\s+/);
  const satirlar = [];
  let s = '';
  for (const k of kelimeler) {
    if ((s + ' ' + k).trim().length > genislik) {
      satirlar.push(s.trim());
      s = k;
    } else s += ' ' + k;
  }
  if (s.trim()) satirlar.push(s.trim());
  return satirlar.map((l) => girinti + l).join('\n');
}

async function main() {
  console.log('');
  console.log(mavi('═'.repeat(80)));
  console.log(mavi('  DENIZ DENT - SESLI ASISTAN DEMOSU'));
  console.log(mavi('  Yapay zeka anahtari kullanilmiyor; bu yollarin hicbiri modele bagli degil.'));
  console.log(mavi('═'.repeat(80)));

  // --- Sunucu ---------------------------------------------------------
  let sunucu = null;
  let port;

  if (DIS_SUNUCU) {
    port = process.env.PORT || 8787;
    console.log(soluk(`  Calisan sunucuya baglaniliyor (port ${port})`));
  } else {
    const istenen = await bosPort();
    console.log(soluk(`  Sunucu baslatiliyor...`));
    const baslatildi = await sunucuBaslat(istenen);
    sunucu = baslatildi.surec;
    port = baslatildi.port;

    if (baslatildi.zatenCalisiyor) {
      console.log(soluk(`  ${port} portunda zaten bir sunucu var, ona baglaniliyor.`));
    } else if (port !== istenen) {
      console.log(soluk(`  (.env icindeki PORT gecerli oldu: ${port})`));
    }
    process.on('exit', () => sunucu?.kill());
    process.on('SIGINT', () => {
      sunucu?.kill();
      process.exit(0);
    });
  }

  // --- Baglanti -------------------------------------------------------
  // Windows'ta "localhost" once ::1 olarak cozulup bazi kurulumlarda
  // takildigi icin 127.0.0.1 de deneniyor.
  const adresler = [`ws://127.0.0.1:${port}/demo/ws`, `ws://localhost:${port}/demo/ws`];
  let ws = null;
  const hatalar = [];

  for (const adres of adresler) {
    const aday = new WebSocket(adres);
    try {
      await new Promise((coz, redet) => {
        aday.once('open', coz);
        // Gercek hatayi YUTMUYORUZ: "baglanilamadi" demek sebebi gizler.
        aday.once('error', (err) => redet(err));
      });
      ws = aday;
      console.log(soluk(`  baglanti: ${adres}`));
      break;
    } catch (err) {
      hatalar.push(`${adres}\n      ${err.message}`);
      aday.terminate?.();
    }
  }

  if (!ws) {
    sunucu?.kill();
    throw new Error(
      `Sunucuya baglanilamadi.\n\n  Denenen adresler:\n    - ${hatalar.join('\n    - ')}`
    );
  }

  let adim = 0;

  // Bekleme, mesaj GONDERILMEDEN once kuruluyor ve yalnizca o anda
  // bekleniyorsa cozuluyor. Boylece onceki turdan artakalan bir 'bitti'
  // sonraki turu erken bitiremiyor.
  let cozucu = null;
  const cozucuCagir = () => {
    const c = cozucu;
    cozucu = null;
    c?.();
  };
  const yanitBekle = (saniye) =>
    new Promise((c) => {
      cozucu = c;
      setTimeout(() => {
        if (cozucu === c) {
          cozucu = null;
          c();
        }
      }, saniye * 1000);
    });

  ws.on('message', (ham) => {
    let m;
    try {
      m = JSON.parse(ham);
    } catch {
      return;
    }

    if (m.tip === 'hazir') {
      console.log('');
      console.log(yesil('▼ ÇAĞRI AÇILDI') + soluk(`   arayan: ${m.arayanNo}   mesai: ${m.mesaiIcinde ? 'içi' : 'dışı'}`));
      console.log('');
      console.log(yesil('  ASİSTAN (karşılama):'));
      console.log(sar(m.karsilama));
      const kelime = String(m.karsilama).split(/\s+/).length;
      console.log(soluk(`\n  ${kelime} kelime, telefonda yaklasik ${(kelime / 2.5).toFixed(0)} saniye`));
      console.log('');
      // BEKLEMEYI COZMUYORUZ. Karsilamadan sonra sunucu ses uretimini
      // bitirip ayrica 'bitti' yolluyor; onu beklemezsek bir sonraki
      // senaryoyu sunucu mesgulken gonderir ve mesaj SESSIZCE DUSER.
      return;
    }

    if (m.tip === 'parca' && m.metin) {
      process.stdout.write(m.metin);
      return;
    }

    if (m.tip === 'olay') {
      const acil = String(m.eylem).includes('acil');
      const etiket = acil ? kirmizi(`  ⚠ ${m.eylem}`) : sari(`  ⚙ ${m.eylem}`);
      const detay = m.detay ? JSON.stringify(m.detay) : '';
      console.log(`\n${etiket}` + soluk(`  ${m.sonuc ?? ''}  ${detay}`));
      return;
    }

    if (m.tip === 'mesgul') {
      // Bu satiri gorurseniz betik erken ilerlemis demektir - eskiden
      // bu durum sessizdi ve senaryo bos gorunuyordu.
      console.log(`\n${sari('  ! sunucu mesgul: ' + (m.mesaj ?? ''))}`);
      return;
    }

    if (m.tip === 'hata') {
      console.log(`\n${kirmizi('  HATA: ' + (m.mesaj ?? ''))}`);
      cozucuCagir();
      return;
    }

    if (m.tip === 'bitti') {
      cozucuCagir();
    }
  });

  // Gorusmeyi baslat, karsilamanin gelmesini bekle.
  // Ses uretimi acikken karsilama birkac saniye surebiliyor.
  const karsilamaBekle = yanitBekle(25);
  ws.send(JSON.stringify({ tip: 'baslat', arayanNo: '+905321112233' }));
  await karsilamaBekle;

  for (const s of SENARYO) {
    adim += 1;
    console.log(soluk('─'.repeat(80)));
    console.log(mavi(`  ${adim}. ${s.beklenen}`));
    console.log('');
    console.log('  ' + yesil('HASTA:') + ' ' + s.soz);
    console.log('');
    process.stdout.write('  ' + yesil('ASİSTAN:') + ' ');

    const yanit = yanitBekle(25);
    ws.send(JSON.stringify({ tip: 'soz', metin: s.soz }));
    await yanit;
    console.log('\n');
    await bekle(300);
  }

  console.log(soluk('─'.repeat(80)));
  console.log('');
  console.log(mavi('  DEMO BITTI.'));
  if (!DIS_SUNUCU) {
    console.log(soluk('  Sunum ekranini gormek isterseniz sunucuyu ayrica baslatin:'));
    console.log(soluk('    npm start     ->  http://localhost:8787/demo'));
  } else {
    console.log(soluk(`  Sabah teslim kuyrugu: http://localhost:${port}/demo`));
  }
  console.log('');
  ws.close();
  sunucu?.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error(kirmizi(`\n  ${err.message}\n`));
  process.exit(1);
});
