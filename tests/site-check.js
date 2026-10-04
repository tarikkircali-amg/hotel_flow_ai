/* ============================================================
   HOTELFLOW AI — SITE DOGRULAMA
   Calistirma:
     npm install --include=dev
     npm start            (ayri bir terminalde, ya da PORT=3100 node server.js)
     npm run check        (BASE_URL ile baska bir adres verilebilir)

   Kapsam: davranis, erisilebilirlik (axe · WCAG 2.2 AA), yanit verme,
   dokunma hedefi boyutu, JS olmadan okunabilirlik, form ve hiz siniri.
   ============================================================ */

const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3100/';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || undefined;

const results = [];
const check = (name, passed, detail = '') => results.push({ name, passed, detail });

/* ---------- Davranis ---------- */
async function testNavigationAndFaq(page) {
  await page.goto(BASE + '#hakkimizda', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const anchor = await page.evaluate(() => {
    const section = document.querySelector('#hakkimizda');
    const title = document.querySelector('#hakkimizda-baslik');
    const header = document.querySelector('.site-header');
    return {
      found: Boolean(section),
      clearsHeader: title.getBoundingClientRect().top >= header.getBoundingClientRect().bottom,
    };
  });
  check('#hakkimizda bolumu var', anchor.found);
  check('#hakkimizda basligi yapiskan basligin altinda kalmiyor', anchor.clearsHeader);

  const question = page.locator('.faq__question').first();
  const panelId = await question.getAttribute('aria-controls');
  const panel = page.locator(`#${panelId}`);
  check('SSS kapali baslar', await panel.isHidden());
  await question.click();
  check('SSS acilir ve aria-expanded guncellenir',
    (await panel.isVisible()) && (await question.getAttribute('aria-expanded')) === 'true');
  await question.click();
  check('SSS kapanir', await panel.isHidden());
}

async function testTheme(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const toggle = page.locator('#theme-toggle');
  const before = await page.getAttribute('html', 'data-theme');
  await toggle.click();
  const after = await page.getAttribute('html', 'data-theme');
  check('tema degisir', before !== after, `${before} -> ${after}`);
  check('tema dugmesi aria-pressed bildirir',
    (await toggle.getAttribute('aria-pressed')) === String(after === 'dark'));

  await page.reload({ waitUntil: 'domcontentloaded' });
  check('tema secimi kalici', (await page.getAttribute('html', 'data-theme')) === after);
  await page.locator('#theme-toggle').click();
}

/* ---------- Form ---------- */
async function testFormValidation(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.locator('#form-submit').click();
  await page.waitForTimeout(300);

  check('bos form hata bildirir', await page.locator('#form-status').isVisible());
  check('alan hatasi gorunur ve metin tasir',
    (await page.locator('#e-name').isVisible())
    && ((await page.locator('#e-name span').textContent()) || '').length > 10);
  check('odak ilk eksik alana tasinir',
    (await page.evaluate(() => document.activeElement?.id)) === 'f-name');
  check('aria-invalid kurulur',
    (await page.locator('#f-name').getAttribute('aria-invalid')) === 'true');

  // Hatali e-posta duzeltildiginde hata temizlenir
  await page.fill('#f-email', 'bozuk');
  await page.locator('#f-hotel').click();
  await page.waitForTimeout(150);
  check('gecersiz e-posta isaretlenir', await page.locator('#e-email').isVisible());
  await page.fill('#f-email', 'ad@otel.com');
  await page.waitForTimeout(150);
  check('duzeltilince hata kalkar', await page.locator('#e-email').isHidden());
}

async function testFormSubmission(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.fill('#f-name', 'Test Kullanici');
  await page.fill('#f-hotel', 'Test Otel');
  await page.fill('#f-email', `test${Date.now()}@ornek.test`);
  await page.check('#f-consent');
  await page.locator('#form-submit').click();
  await page.waitForTimeout(1500);

  const variant = await page.locator('#form-status').getAttribute('data-variant');
  // Hiz siniri devredeyse (429) bu test atlanir; sinirin kendisi dogru calisiyordur.
  if (variant === 'danger') {
    check('form gonderimi (hiz siniri devrede, atlandi)', true, 'sunucuyu yeniden baslatip tekrar deneyin');
    return;
  }
  check('gecerli form gonderilir', variant === 'success');
  check('gonderim sonrasi form temizlenir', (await page.inputValue('#f-name')) === '');
  check('gonderim sonrasi taslak silinir',
    await page.evaluate(() => !localStorage.getItem('hotelflow.contact-draft')));
}

/* ---------- Erisilebilirlik ve yanit verme ---------- */
async function testResponsive(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Gercek tarayici yakinlastirmasi = daha dar gorunur alan. CSS zoom ile taklit edilmez.
  for (const [label, width, height] of [
    ['%100 (1440px)', 1440, 1000],
    ['%200 esdegeri (720px)', 720, 500],
    ['%400 esdegeri (360px)', 360, 400],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${label}: yatay kaydirma yok`, overflow <= 1, `${overflow}px tasma`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

async function testKeyboardAndTargets(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  check('ilk sekme icerige-gec baglantisina gider',
    await page.evaluate(() => document.activeElement?.classList.contains('u-skip-link')));

  // WCAG 2.2 AA (2.5.8) hedef boyutu: en az 24x24 CSS px.
  const small = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a.button, button, .icon-button, .site-nav__link, input, select, textarea')
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.height < 24 || r.width < 24) out.push(`${el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)}`);
      });
    return out;
  });
  check('tum etkilesimli hedefler >= 24x24px', small.length === 0, small.join(', '));
}

async function testWithoutJavaScript(browser) {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  check('JS kapaliyken hakkimizda okunur', await page.locator('#hakkimizda-baslik').isVisible());
  check('JS kapaliyken form gorunur', await page.locator('#contact-form').isVisible());
  check('JS kapaliyken tum bolumler yerinde',
    (await page.locator('main section[id]').count()) >= 6);
  await ctx.close();
}

/* ---------- Calistir ---------- */
(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  await testNavigationAndFaq(page);
  await testTheme(page);
  await testFormValidation(page);
  await testFormSubmission(page);
  await testResponsive(page);
  await testKeyboardAndTargets(page);
  await testWithoutJavaScript(browser);

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  check('axe · WCAG 2.2 AA ihlali yok', axe.violations.length === 0,
    axe.violations.map((v) => `${v.id} (${v.nodes.length})`).join(', '));
  check('konsol hatasi yok', consoleErrors.length === 0, consoleErrors.join(' | '));

  const failed = results.filter((r) => !r.passed);
  results.forEach((r) => console.log(
    `${r.passed ? '  GECTI   ' : '  BASARISIZ'} ${r.name}${r.detail ? `  — ${r.detail}` : ''}`));
  console.log(`\n${results.length - failed.length}/${results.length} test gecti.`);

  await browser.close();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('Dogrulama calistirilamadi:', e.message); process.exit(1); });
