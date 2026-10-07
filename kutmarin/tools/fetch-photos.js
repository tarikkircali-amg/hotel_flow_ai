#!/usr/bin/env node
/* ============================================================
   KUT MARİN — kutmarin.com'daki ÜRÜN GÖRSELLERİNİ İNDİRİR

   Kendi sitenizdeki görselleri kategorilerine göre indirir,
   assets/img/photos/ altına yerleştirir ve products.json içindeki
   kategorilere "photo" alanını ekler.

     node tools/fetch-photos.js            # indir ve yerleştir
     node tools/fetch-photos.js --dry      # sadece bul, indirme
     node tools/fetch-photos.js --limit 3  # kategori başına en çok 3 görsel

   NOT: Bu betik yalnızca kutmarin.com'a bağlanır; başka alan adından
   görsel indirmez. Site sizin olduğu için görseller de sizindir.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PHOTO_DIR = path.join(ROOT, 'assets', 'img', 'photos');
const PRODUCTS = path.join(ROOT, 'assets', 'data', 'products.json');

const SITE = 'https://kutmarin.com';
const ALLOWED_HOST = /(^|\.)kutmarin\.com$/i;   // baska alan adina gidilmez

const DRY = process.argv.includes('--dry');
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1])
  || Number(process.argv[process.argv.indexOf('--limit') + 1]) || 6;

/* ---------- Site kategorisi → bizim kategori kimliğimiz ----------
   Katalog sayfasının başlığındaki kelimelere bakılır. Sıra önemlidir:
   "dar şaft", "şaft"tan önce denenir.                               */
const MAP = [
  [/dar\s*şaft|dar\s*saft/i,                 'dar-saft'],
  [/şaft|saft/i,                             'saft'],
  [/venus/i,                                 'venus'],
  [/demirli/i,                               'demirli'],
  [/ufo/i,                                   'ufo'],
  [/çubuk|cubuk/i,                           'cubuk'],
  [/max\s*prop/i,                            'max-prop'],
  [/bow\s*thruster|baş\s*pervane|side\s*power/i, 'bow-thruster'],
  [/pervane/i,                               'pervane'],
  [/volvo/i,                                 'volvo-penta'],
  [/evinrude/i,                              'evinrude'],
  [/kuyruk/i,                                'kuyruk'],
  [/motor|tapa/i,                            'motor-tapa'],
  [/özel|ozel/i,                             'ozel-tekne'],
  [/damla/i,                                 'damla-kursun'],
  [/dalgıç|dalgic|kemer/i,                   'dalgic-kemer'],
];

const categoryOf = (text) => (MAP.find(([re]) => re.test(text)) || [])[1] || null;

/* ---------- Ağ ---------- */
function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('çok fazla yönlendirme'));
    const u = new URL(url);
    if (!ALLOWED_HOST.test(u.hostname)) return reject(new Error(`izin verilmeyen host: ${u.hostname}`));

    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(url, {
      headers: { 'User-Agent': 'KutMarin-site-kurulumu/1.0', 'Accept': '*/*' },
      timeout: 25000,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return resolve(get(new URL(res.headers.location, url).href, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ body: Buffer.concat(chunks), type: res.headers['content-type'] || '' }));
    });
    req.on('timeout', () => { req.destroy(new Error('zaman aşımı')); });
    req.on('error', reject);
  });
}

/* ---------- Ayrıştırma (dışa açık: fixture ile test edilir) ---------- */
function extractImages(html, baseUrl) {
  const found = new Set();
  const push = (raw) => {
    if (!raw) return;
    const clean = raw.trim().replace(/^["']|["']$/g, '');
    if (!clean || clean.startsWith('data:')) return;
    let abs;
    try { abs = new URL(clean, baseUrl).href; } catch { return; }
    if (!ALLOWED_HOST.test(new URL(abs).hostname)) return;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(abs)) return;
    found.add(abs.split('#')[0]);
  };

  // <img src>, data-src, data-original
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    for (const attr of ['src', 'data-src', 'data-original', 'data-lazy', 'data-image']) {
      const a = tag.match(new RegExp(`\\b${attr}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i'));
      if (a) push(a[1]);
    }
    const srcset = tag.match(/\bsrcset\s*=\s*("[^"]*"|'[^']*')/i);
    if (srcset) srcset[1].replace(/^["']|["']$/g, '').split(',')
      .forEach((part) => push(part.trim().split(/\s+/)[0]));
  }
  // style="background-image:url(...)"
  for (const m of html.matchAll(/background-image\s*:\s*url\(([^)]+)\)/gi)) push(m[1]);
  // <a href="...jpg">  (büyük görsele giden bağlantılar)
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*("[^"]*"|'[^']*')/gi)) push(m[1]);

  return [...found];
}

function extractLinks(html, baseUrl) {
  const found = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi)) {
    const raw = m[1].trim().replace(/^["']|["']$/g, '');
    if (!raw || raw.startsWith('#') || /^(mailto|tel|javascript):/i.test(raw)) continue;
    let abs;
    try { abs = new URL(raw, baseUrl).href; } catch { continue; }
    if (!ALLOWED_HOST.test(new URL(abs).hostname)) continue;
    found.add(abs.split('#')[0]);
  }
  return [...found];
}

const titleOf = (html) => {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return ((h1 && h1[1]) || (t && t[1]) || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const isCatalogOrProduct = (url) => /\((katalog|urun)\)/i.test(url) || /raf\[\d+\]/i.test(url);

/* ---------- Tarama ---------- */
async function crawl() {
  const queue = [SITE];
  const seen = new Set();
  const byCategory = new Map();          // kategori kimliği → Set(görsel url)
  let pages = 0;

  while (queue.length && pages < 220) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);

    let page;
    try { page = await get(url); } catch (error) {
      console.warn(`  atlandı  ${url.slice(0, 80)} — ${error.message}`);
      continue;
    }
    if (!/text\/html/i.test(page.type)) continue;
    pages += 1;

    const html = page.body.toString('utf8');
    const title = titleOf(html);
    const category = categoryOf(`${title} ${decodeURIComponent(url)}`);

    if (category) {
      if (!byCategory.has(category)) byCategory.set(category, new Set());
      const bucket = byCategory.get(category);
      extractImages(html, url).forEach((i) => bucket.add(i));
    }

    extractLinks(html, url)
      .filter((l) => !seen.has(l) && isCatalogOrProduct(l))
      .forEach((l) => queue.push(l));

    process.stdout.write(`\r  taranan sayfa: ${pages}   `);
  }
  console.log('');
  return byCategory;
}

/* ---------- İndirme ---------- */
async function download(byCategory) {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const data = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
  const hashes = new Map();
  const saved = {};

  for (const [category, urls] of byCategory) {
    const list = [...urls].slice(0, LIMIT);
    let index = 0;
    for (const url of list) {
      let file;
      try { file = await get(url); } catch (error) {
        console.warn(`  inemedi  ${url.slice(0, 70)} — ${error.message}`);
        continue;
      }
      if (file.body.length < 3000) continue;                 // ikon/boş görsel
      const hash = crypto.createHash('sha1').update(file.body).digest('hex');
      if (hashes.has(hash)) continue;                        // aynı görsel
      hashes.set(hash, true);

      const ext = (url.match(/\.(jpe?g|png|webp)/i) || [, 'jpg'])[1].toLowerCase();
      const name = index === 0 ? `${category}.${ext}` : `${category}-${index + 1}.${ext}`;
      if (!DRY) fs.writeFileSync(path.join(PHOTO_DIR, name), file.body);
      if (index === 0) saved[category] = name;
      index += 1;
    }
    console.log(`  ${category.padEnd(14)} ${index} görsel`);
  }

  if (!DRY) {
    data.categories.forEach((c) => { if (saved[c.id]) c.photo = saved[c.id]; });
    fs.writeFileSync(PRODUCTS, JSON.stringify(data, null, 2) + '\n');
  }
  return saved;
}

/* ---------- Çalıştır ---------- */
async function main() {
  console.log(`\n  kutmarin.com taranıyor${DRY ? ' (deneme — indirme yok)' : ''}…\n`);
  const byCategory = await crawl();

  if (!byCategory.size) {
    console.error('\n  Hiç görsel bulunamadı. Siteye erişilemiyorsa ortamın ağ' +
                  '\n  ayarlarında kutmarin.com izinli olmalı.\n');
    process.exit(1);
  }

  console.log(`\n  ${byCategory.size} kategoride görsel bulundu:\n`);
  const saved = await download(byCategory);

  console.log(`\n  ${Object.keys(saved).length} kategoriye fotoğraf bağlandı.` +
              `${DRY ? ' (deneme: dosya yazılmadı)' : ''}\n`);
}

if (require.main === module) {
  main().catch((error) => { console.error('\n  Hata:', error.message, '\n'); process.exit(1); });
}

module.exports = { extractImages, extractLinks, categoryOf, titleOf, isCatalogOrProduct };
