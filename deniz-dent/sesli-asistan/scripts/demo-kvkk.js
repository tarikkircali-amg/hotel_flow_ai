'use strict';

// KVKK KARSILAMA DEMOSU
//
//   node scripts/demo-kvkk.js
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

const PORT = process.env.PORT || 8787;
const ADRES = `ws://localhost:${PORT}/demo/ws`;

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

  const ws = new WebSocket(ADRES);

  await new Promise((coz, redet) => {
    ws.on('open', coz);
    ws.on('error', () =>
      redet(new Error(`Sunucuya baglanilamadi: ${ADRES}\n  Once: DEMO_MOD=true PORT=${PORT} npm start`))
    );
  });

  let adim = 0;
  let bekleyenYanit = null;

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
      bekleyenYanit?.();
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

    if (m.tip === 'bitti' || m.tip === 'yanit') {
      bekleyenYanit?.();
    }
  });

  // Gorusmeyi baslat, karsilamanin gelmesini bekle.
  ws.send(JSON.stringify({ tip: 'baslat', arayanNo: '+905321112233' }));
  await new Promise((c) => {
    bekleyenYanit = c;
    setTimeout(c, 5000);
  });

  for (const s of SENARYO) {
    adim += 1;
    console.log(soluk('─'.repeat(80)));
    console.log(mavi(`  ${adim}. ${s.beklenen}`));
    console.log('');
    console.log('  ' + yesil('HASTA:') + ' ' + s.soz);
    console.log('');
    process.stdout.write('  ' + yesil('ASİSTAN:') + ' ');

    ws.send(JSON.stringify({ tip: 'soz', metin: s.soz }));

    await new Promise((c) => {
      bekleyenYanit = c;
      setTimeout(c, 6000);
    });
    console.log('\n');
    await bekle(300);
  }

  console.log(soluk('─'.repeat(80)));
  console.log('');
  console.log(mavi('  DEMO BITTI.'));
  console.log(soluk('  Sabah teslim kuyrugunu gormek icin: http://localhost:' + PORT + '/demo'));
  console.log('');
  ws.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(kirmizi(`\n  ${err.message}\n`));
  process.exit(1);
});
