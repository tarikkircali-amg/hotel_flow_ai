/* ============================================================
   fetch-photos.js ayrıştırma testleri
   Siteye bağlanmadan çalışır; örnek bir katalog sayfası üzerinden
   görsel bulma, dış bağlantı eleme ve kategori eşleştirmeyi doğrular.

     node tools/fetch-photos.test.js
   ============================================================ */
const t = require('./fetch-photos.js');
let fail = 0;
const ok = (n, c, d='') => { if(!c) fail++; console.log(`${c?'  GECTI   ':'  BASARISIZ'} ${n}${d?'  — '+d:''}`); };

// Bir e-ticaret katalog sayfasini taklit eden ornek
const html = `<!doctype html><html><head><title>Şaft Tutyaları / Tutya ve Döküm</title></head><body>
<h1>Şaft Tutyaları</h1>
<a href="/120-lik-saft-tutya_(urun)_(4143511769)">120'lik</a>
<a href="/venus-tip-tutyalar-(katalog)/raf[19]">Venus</a>
<a href="/iletisim_formu">İletişim</a>
<a href="https://instagram.com/x">Instagram</a>
<img src="/resim/urun/saft-120.jpg" alt="">
<img data-src="/resim/urun/saft-100.JPEG">
<img src="/tema/ikon/sepet.png" srcset="/resim/urun/saft-80.webp 2x, /resim/urun/saft-70.jpg 1x">
<div style="background-image:url('/resim/urun/saft-detay.png')"></div>
<a href="/resim/buyuk/saft-120-buyuk.jpg">Büyüt</a>
<img src="data:image/gif;base64,R0lGOD">
<img src="https://cdn.baskasite.com/calinti.jpg">
</body></html>`;

const imgs = t.extractImages(html, 'https://kutmarin.com/saft_tutyalari-(katalog)/raf[20]');
ok('gorseller mutlak adrese cevrildi', imgs.every(u=>u.startsWith('https://kutmarin.com/')));
ok('img src bulundu', imgs.some(u=>u.endsWith('saft-120.jpg')));
ok('data-src (tembel yukleme) bulundu', imgs.some(u=>/saft-100\.JPEG$/i.test(u)));
ok('srcset icindekiler bulundu', imgs.some(u=>u.endsWith('saft-80.webp')) && imgs.some(u=>u.endsWith('saft-70.jpg')));
ok('background-image bulundu', imgs.some(u=>u.endsWith('saft-detay.png')));
ok('buyuk goersele giden link bulundu', imgs.some(u=>u.endsWith('saft-120-buyuk.jpg')));
ok('data: URI alinmadi', !imgs.some(u=>u.startsWith('data:')));
ok('BASKA SITENIN gorseli alinmadi', !imgs.some(u=>u.includes('baskasite')), 'telif koruması');
console.log('     bulunan gorsel sayisi:', imgs.length);

const links = t.extractLinks(html, 'https://kutmarin.com/x');
ok('dis baglanti elendi', !links.some(l=>l.includes('instagram')));
const crawlable = links.filter(t.isCatalogOrProduct);
ok('yalnizca katalog/urun sayfalari taranir', crawlable.length===2, crawlable.length+' sayfa');

// Kategori eslestirme
const cases = [
  ['Şaft Tutyaları','saft'], ['Dar Şaft Tutyaları','dar-saft'], ['Venus Tip Tutyalar','venus'],
  ['Demirli Tutyalar','demirli'], ['Max Prop Tutyaları','max-prop'],
  ['Bow Thruster Tutyaları','bow-thruster'], ['Pervane Tutyaları','pervane'],
  ['Volvo Penta Tutyaları','volvo-penta'], ['Kuyruk Tutyaları','kuyruk'],
  ['Motor Tutyaları ve Tapaları','motor-tapa'], ['Dalgıç Kemer Kurşunu','dalgic-kemer'],
  ['Damla Kurşun','damla-kursun'], ['Hakkımızda',null],
];
let bad = cases.filter(([txt,exp]) => t.categoryOf(txt) !== exp);
ok('kategori eslestirme (13 ornek)', bad.length===0,
   bad.map(([x,e])=>`${x}→${t.categoryOf(x)} (beklenen ${e})`).join(', '));
ok('"dar saft" once denenir', t.categoryOf('Dar Şaft Tutyaları')==='dar-saft');
ok('baslik h1\'den okunuyor', t.titleOf(html)==='Şaft Tutyaları');

console.log(`\n${fail? fail+' test BASARISIZ':'tum testler gecti'}`);
process.exit(fail?1:0);
