const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

/* ============================================================
   KUT MARİN — SİTE DOĞRULAMA
   Çalıştırma:
     npx serve kutmarin       (ya da:  cd kutmarin && python3 -m http.server 3200)
     node tests/site-check.js
   Kapsam: çok dillilik (9 dil + RTL), katalog ve filtreler, WhatsApp
   sipariş listesi, erişilebilirlik (axe · WCAG 2.2 AA), yanıt verme.
   ============================================================ */
const B = process.env.BASE_URL || 'http://127.0.0.1:3200/';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;
const r = []; const ok = (n,p,d='') => r.push({n,p,d});

(async () => {
  const br = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'tr-TR' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: '+e.message));

  // --- Ana sayfa ---
  await page.goto(B+'index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  ok('ana sayfa basligi cevrildi', (await page.textContent('.hero__title'))?.includes('tutya'));
  ok('hero lead dolduruldu', ((await page.textContent('.hero__lead'))||'').length > 40);
  const groups = await page.locator('#group-grid li').count();
  ok('urun gruplari cizildi', groups === 5, groups+' grup');
  ok('karina semasi yuklendi', await page.locator('.diagram__image').first().isVisible());
  const waHref = await page.getAttribute('.wa-float', 'href');
  ok('WhatsApp baglantisi kuruldu', (waHref||'').startsWith('https://wa.me/905447329306?text='), (waHref||'').slice(0,46));

  // --- Urunler + filtre ---
  await page.goto(B+'urunler.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const all = await page.locator('#product-grid .product').count();
  ok('tum urunler listelendi', all === 17, all+' urun');
  ok('urun sayaci yazdi', ((await page.textContent('#product-count'))||'').match(/\d+/) !== null);
  // "Pervane tutyalari" grubunu sec
  await page.locator('#filter-group .chip', { hasText: 'Pervane tutyaları' }).first().click();
  await page.waitForTimeout(300);
  const prop = await page.locator('#product-grid .product').count();
  ok('grup filtresi daraltti', prop > 0 && prop < all, `${prop}/${all}`);
  await page.locator('#filter-clear').click();
  await page.waitForTimeout(250);
  ok('filtre temizlendi', (await page.locator('#product-grid .product').count()) === all);
  // Fiyat gosterimi
  const priceTexts = await page.locator('.product__price').allTextContents();
  ok('tum urunler "fiyat sorunuz" diyor', priceTexts.length > 0 && priceTexts.every(t=>/sorunuz/i.test(t)));
  ok('sayfada hic fiyat yok', !priceTexts.some(t=>/₺|TRY|\d/.test(t)));

  // --- Sepet + WhatsApp mesaji ---
  await page.locator('.product__add').first().click();
  await page.locator('.product__add').nth(2).click();
  await page.waitForTimeout(300);
  ok('sepet sayaci arttı', (await page.textContent('[data-cart-count]')) === '2');
  await page.locator('[data-cart-open]').click();
  await page.waitForTimeout(300);
  ok('cekmece acildi', await page.locator('#cart-drawer').isVisible());
  ok('sepette 2 satir var', (await page.locator('.cart-item').count()) === 2);
  const sendHref = await page.getAttribute('#cart-send', 'href');
  const msg = decodeURIComponent((sendHref||'').split('?text=')[1]||'');
  ok('siparis mesaji olustu', msg.includes('SİPARİŞ LİSTESİ'), '');
  ok('mesajda fiyat gecmiyor', !/₺|TRY|toplam/i.test(msg));
  ok('sepette toplam satiri gizli', await page.locator('.cart-total').isHidden());
  console.log('\n--- OLUSAN WHATSAPP MESAJI ---\n'+msg+'\n------------------------------\n');
  // Adet degistir
  await page.locator('.cart-item__input').first().fill('3');
  await page.locator('.cart-item__input').first().dispatchEvent('change');
  await page.waitForTimeout(250);
  ok('adet guncellendi', (await page.textContent('[data-cart-count]')) === '4');
  // Kaliciligi
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(700);
  ok('liste yenilemeden sonra duruyor', (await page.textContent('[data-cart-count]')) === '4');

  // --- Dil degisimi ---
  await page.selectOption('.site-header__actions [data-lang-select]', 'de');
  await page.waitForTimeout(600);
  ok('Almanca yuklendi', (await page.getAttribute('html','lang')) === 'de');
  ok('Almanca metin geldi', ((await page.textContent('#urunler-baslik'))||'').length>0 && (await page.textContent('.site-nav__link'))?.includes('Start'));
  const deName = await page.locator('.product__title').first().textContent();
  ok('urun adi Almancaya cevrildi', /anode/i.test(deName||''), deName);

  await page.selectOption('.site-header__actions [data-lang-select]', 'ar');
  await page.waitForTimeout(600);
  ok('Arapca RTL kuruldu', (await page.getAttribute('html','dir')) === 'rtl' && (await page.getAttribute('html','lang')) === 'ar');
  const arName = await page.locator('.product__title').first().textContent();
  ok('urun adi Arapcaya cevrildi', /[؀-ۿ]/.test(arName||''), arName);

  await page.selectOption('.site-header__actions [data-lang-select]', 'tr');
  await page.waitForTimeout(500);
  ok('Turkceye donuldu', (await page.getAttribute('html','dir')) === 'ltr');

  // --- Tarayici diline gore acilis ---
  for (const [loc, expect] of [['tr-TR','tr'], ['de-DE','de'], ['en-US','en'], ['ru-RU','ru'], ['ja-JP','tr']]) {
    const c = await br.newContext({ locale: loc, viewport: { width: 1200, height: 800 } });
    const q = await c.newPage();
    await q.goto(B+'index.html', { waitUntil: 'networkidle' });
    await q.waitForTimeout(600);
    const got = await q.getAttribute('html','lang');
    ok(`tarayici dili ${loc} -> ${expect}`, got === expect, 'gelen: '+got);
    await c.close();
  }

  // --- Erisilebilirlik: her sayfa ---
  for (const p of ['index.html','urunler.html','rehber.html','hakkimizda.html','iletisim.html']) {
    await page.goto(B+p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const a = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
    ok(`axe WCAG 2.2 AA · ${p}`, a.violations.length === 0,
      a.violations.map(v=>`${v.id}(${v.nodes.length})`).join(', '));
  }

  // --- Yanit verme ---
  for (const [l,w,h] of [['%200 (720px)',720,600],['%400 (360px)',360,420]]) {
    await page.setViewportSize({width:w,height:h}); await page.waitForTimeout(400);
    const of = await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(`${l} yatay kaydirma yok`, of<=1, of+'px');
  }
  await page.setViewportSize({width:1440,height:1000});

  ok('konsol hatasi yok', errs.length===0, errs.slice(0,3).join(' | '));

  let fail=0;
  r.forEach(x=>{ if(!x.p) fail++; console.log(`${x.p?'  GECTI   ':'  BASARISIZ'} ${x.n}${x.d?'  — '+x.d:''}`); });
  console.log(`\n${r.length-fail}/${r.length} test gecti.`);
  await br.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('Dogrulama calistirilamadi:', e.message); process.exit(1); });
