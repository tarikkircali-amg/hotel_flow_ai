#!/usr/bin/env node
/* ============================================================
   KUT MARİN — YEREL SUNUCU
   Siteyi kendi bilgisayarınızda açmak için. Kurulum gerekmez,
   hiçbir pakete bağımlı değildir; yalnızca Node.js yeterlidir.

     node serve.js            → http://localhost:4300
     node serve.js 8080       → başka bir port

   Neden gerekli: index.html dosyasına çift tıklarsanız tarayıcı
   "file://" açar ve güvenlik gereği ürün listesi ile dil
   dosyalarını (JSON) okumayı engeller. Site boş görünür.
   Bu sunucu bunu çözer.
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 4300);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt':  'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Geçersiz adres.');
  }

  if (pathname.endsWith('/')) pathname += 'index.html';

  // Klasör dışına çıkmaya çalışan adresleri reddet.
  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Erişim yok.');
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(
        '<meta charset="utf-8"><h1>Sayfa bulunamadı</h1>' +
        `<p>Aranan: <code>${pathname.replace(/[<&]/g, '')}</code></p>` +
        '<p><a href="/">Ana sayfaya dön</a></p>');
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n  ${PORT} portu kullanımda. Başka bir port deneyin:\n` +
                  `     node serve.js ${PORT + 1}\n`);
  } else {
    console.error('\n  Sunucu başlatılamadı:', error.message, '\n');
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`
  Kut Marin sitesi çalışıyor.

     http://localhost:${PORT}

  Durdurmak için: Ctrl + C
`);
});
