// Sunucusuz demo derlemesi: gerçek arayüz + tarayıcı içi sahte sunucu → tek HTML dosyası.
//   npm run demo  →  dist/demo.html (tam belge; Hostinger'a statik dosya olarak da konabilir)
//                    dist/demo-fragment.html (Claude Artifact gibi iskeleti kendisi ekleyen ortamlar için)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const js = (await build({
  entryPoints: [join(root, 'demo/entry.js')], bundle: true, format: 'iife', minify: true,
  platform: 'browser', target: 'es2020', write: false, charset: 'utf8',
})).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const css = ['public/css/tokens.css', 'public/css/app.css', 'public/css/office.css'].map(read).join('\n') + `
.demo-banner { background: var(--ai-soft); color: var(--text); border-bottom: 1px solid var(--border);
  padding: 8px 16px; font-size: var(--fs-s); display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.demo-banner strong { color: var(--ai); }
/* Demo görüntüleyicileri dosya indirmeye izin vermeyebilir; indirme düğmeleri demoda gizlenir. */
a[download], [data-png] { display: none !important; }`;

const html = read('public/index.html');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script[^>]*src="js\/app\.js"[^>]*><\/script>/, '');
const banner = `<div class="demo-banner" role="note"><strong>🧪 Canlı demo</strong>
  <span>Tarayıcıda çalışan simülasyon: içerikler şablondur, hiçbir şey kaydedilmez veya gönderilmez.
  Birkaç saniye içinde ekip yeni bir kampanya üzerinde çalışmaya başlar — karakterleri izleyin.</span></div>`;

const fragment = `<title>MİZ Marketing OS</title>
<style>${css}</style>
${banner}
${body}
<script>${js}</script>
`;
const full = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>MİZ Marketing OS</title>
<style>${css}</style>
</head><body>
${banner}
${body}
<script>${js}</script>
</body></html>
`;
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/demo-fragment.html'), fragment);
writeFileSync(join(root, 'dist/demo.html'), full);
console.log(`demo hazır: dist/demo.html (${(full.length / 1024).toFixed(0)} KB)`);
