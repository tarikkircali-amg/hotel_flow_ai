/* ============================================================
   KUT MARİN — SAYFA İÇERİKLERİ
   Çalıştırma:  node build-pages.js
   Metinlerin tamamı data-i18n ile sözlükten gelir; buradaki
   Türkçe karşılıklar JavaScript kapalıyken görünen yedektir.
   ============================================================ */
const { page, ico, ROOT, fs, path } = require('./build-pages.js');

const T = 'Kut Marin · Tutya ve Döküm Kurşun İmalatı';
const D = 'Şaft, pervane, karina ve motor tutyaları ile dökme kurşun ağırlıklar. İzmir Karabağlar\'da kendi dökümümüz, ölçüye göre özel üretim. WhatsApp\'tan sipariş.';

/* ============ ANA SAYFA ============ */
const index = `
<section class="hero">
  <div class="u-container hero__grid">
    <div>
      <p class="badge badge--hero" data-i18n="hero.badge">İzmir'de tutya ve kurşun dökümü</p>
      <h1 class="hero__title" data-i18n="hero.title">Teknenizin su altındaki metalini koruyan tutya</h1>
      <p class="hero__lead" data-i18n="hero.lead"></p>
      <div class="hero__actions">
        <a class="button button--primary" href="urunler.html" data-i18n="hero.ctaProducts">Ürünleri gör</a>
        <a class="button button--whatsapp" data-wa-quick href="#" target="_blank" rel="noopener">
          ${ico('i-whatsapp', 20)}<span data-i18n="hero.ctaWhatsapp">WhatsApp'tan sor</span>
        </a>
      </div>
      <p class="hero__note" data-i18n="hero.note"></p>
    </div>
    <figure class="diagram">
      <img class="diagram__image" src="assets/img/karina-semasi.svg" width="1000" height="560"
        alt="Bir motor teknenin su altı yan kesiti: baş pervane tüneli, karina gövdesi, pervane mili ve pervane üzerinde tutyaların takıldığı dört nokta numaralandırılarak gösterilir.">
      <ol class="diagram__legend">
        <li><span class="diagram__num">1</span><span data-i18n="cat.bow-thruster.name"></span></li>
        <li><span class="diagram__num">2</span><span data-i18n="group.hull"></span></li>
        <li><span class="diagram__num">3</span><span data-i18n="cat.saft.name"></span></li>
        <li><span class="diagram__num">4</span><span data-i18n="cat.pervane.name"></span></li>
      </ol>
      <figcaption class="diagram__caption">
        <strong data-i18n="hero.diagramTitle">Tekne altında tutya nereye takılır?</strong>
        <span data-i18n="hero.diagramCaption"></span>
      </figcaption>
    </figure>
  </div>
</section>

<section class="section section--surface" aria-labelledby="neden">
  <div class="u-container">
    <h2 class="u-visually-hidden" id="neden">Neden Kut Marin</h2>
    <ul class="grid grid--4">
      <li class="card">
        <span class="card__icon" aria-hidden="true">${ico('i-flame')}</span>
        <h3 class="card__title" data-i18n="trust.t1">Kendi dökümümüz</h3>
        <p class="card__text" data-i18n="trust.d1"></p>
      </li>
      <li class="card">
        <span class="card__icon" aria-hidden="true">${ico('i-ruler')}</span>
        <h3 class="card__title" data-i18n="trust.t2">Ölçüye göre üretim</h3>
        <p class="card__text" data-i18n="trust.d2"></p>
      </li>
      <li class="card">
        <span class="card__icon" aria-hidden="true">${ico('i-layers')}</span>
        <h3 class="card__title" data-i18n="trust.t3">Geniş ürün ağı</h3>
        <p class="card__text" data-i18n="trust.d3"></p>
      </li>
      <li class="card">
        <span class="card__icon" aria-hidden="true">${ico('i-whatsapp')}</span>
        <h3 class="card__title" data-i18n="trust.t4">WhatsApp'tan sipariş</h3>
        <p class="card__text" data-i18n="trust.d4"></p>
      </li>
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="gruplar">
  <div class="u-container">
    <div class="section__head">
      <p class="section__eyebrow" data-i18n="nav.products">Ürünler</p>
      <h2 class="section__title" id="gruplar" data-i18n="products.groupsTitle">Ürün grupları</h2>
      <p class="section__lead" data-i18n="products.groupsLead"></p>
    </div>
    <p class="notice" data-catalog-error hidden>
      ${ico('i-alert', 22)}
      <span>
        <strong class="notice__title">Ürün listesi yüklenemedi</strong>
        <span class="notice__text">Sayfayı yenileyin. Sorun sürerse ürünleri WhatsApp'tan sorabilirsiniz.</span>
      </span>
    </p>
    <ul class="grid grid--3" id="group-grid"></ul>
  </div>
</section>

<section class="section section--surface" aria-labelledby="rehber-ozet">
  <div class="u-container split">
    <div>
      <p class="section__eyebrow" data-i18n="nav.guide">Tutya rehberi</p>
      <h2 class="section__title" id="rehber-ozet" data-i18n="guide.title">Hangi tutyayı almalıyım?</h2>
      <div class="prose">
        <p data-i18n="guide.lead"></p>
        <p data-i18n="guide.s1d"></p>
      </div>
      <div class="hero__actions" style="margin-block-start: var(--spacing-24)">
        <a class="button button--primary" href="rehber.html" data-i18n="nav.guide">Tutya rehberi</a>
      </div>
    </div>
    <ul class="water-list">
      <li class="water water--zn"><span class="water__symbol">Zn</span><span data-i18n="guide.s1zn"></span></li>
      <li class="water water--al"><span class="water__symbol">Al</span><span data-i18n="guide.s1al"></span></li>
      <li class="water water--mg"><span class="water__symbol">Mg</span><span data-i18n="guide.s1mg"></span></li>
    </ul>
  </div>
</section>`;

/* ============ ÜRÜNLER ============ */
const urunler = `
<section class="section" aria-labelledby="urunler-baslik">
  <div class="u-container">
    <div class="section__head">
      <p class="section__eyebrow" data-i18n="nav.products">Ürünler</p>
      <h1 class="section__title" id="urunler-baslik" data-i18n="products.catalogTitle">Ürün kataloğu</h1>
      <p class="section__lead" data-i18n="products.catalogLead"></p>
    </div>

    <div class="filters">
      <div class="filters__row">
        <h2 class="filters__label" data-i18n="filter.group">Ürün grubu</h2>
        <div class="filters__chips" id="filter-group"></div>
      </div>
      <div class="filters__row">
        <h2 class="filters__label" data-i18n="filter.material">Malzeme</h2>
        <div class="filters__chips" id="filter-material"></div>
      </div>
      <div class="filters__foot">
        <p class="result-count" id="product-count" role="status" aria-live="polite"></p>
        <button class="chip" type="button" id="filter-clear" data-i18n="filter.clear">Filtreleri temizle</button>
      </div>
    </div>

    <p class="notice" data-catalog-error hidden>
      ${ico('i-alert', 22)}
      <span>
        <strong class="notice__title">Ürün listesi yüklenemedi</strong>
        <span class="notice__text">Sayfayı yenileyin. Sorun sürerse ürünleri WhatsApp'tan sorabilirsiniz.</span>
      </span>
    </p>

    <ul class="grid grid--products" id="product-grid"></ul>
  </div>
</section>`;

/* ============ REHBER ============ */
const rehber = `
<section class="section" aria-labelledby="rehber-baslik">
  <div class="u-container">
    <div class="section__head">
      <p class="section__eyebrow" data-i18n="nav.guide">Tutya rehberi</p>
      <h1 class="section__title" id="rehber-baslik" data-i18n="guide.title">Hangi tutyayı almalıyım?</h1>
      <p class="section__lead" data-i18n="guide.lead"></p>
    </div>

    <ol class="step-list">
      <li class="step">
        <span class="step__badge" aria-hidden="true">1</span>
        <div class="step__body">
          <h2 class="step__title" data-i18n="guide.s1t">Suyunuz hangisi?</h2>
          <p class="step__text" data-i18n="guide.s1d"></p>
          <ul class="water-list">
            <li class="water water--zn"><span class="water__symbol">Zn</span><span data-i18n="guide.s1zn"></span></li>
            <li class="water water--al"><span class="water__symbol">Al</span><span data-i18n="guide.s1al"></span></li>
            <li class="water water--mg"><span class="water__symbol">Mg</span><span data-i18n="guide.s1mg"></span></li>
          </ul>
        </div>
      </li>
      <li class="step">
        <span class="step__badge" aria-hidden="true">2</span>
        <div class="step__body">
          <h2 class="step__title" data-i18n="guide.s2t">Hangi parçayı koruyacaksınız?</h2>
          <p class="step__text" data-i18n="guide.s2d"></p>
          <figure class="diagram" style="margin-block-start: var(--spacing-16)">
            <img class="diagram__image" src="assets/img/karina-semasi.svg" width="1000" height="560"
              alt="Bir motor teknenin su altı yan kesiti: baş pervane tüneli, karina gövdesi, pervane mili ve pervane üzerinde tutyaların takıldığı dört nokta numaralandırılarak gösterilir.">
      <ol class="diagram__legend">
        <li><span class="diagram__num">1</span><span data-i18n="cat.bow-thruster.name"></span></li>
        <li><span class="diagram__num">2</span><span data-i18n="group.hull"></span></li>
        <li><span class="diagram__num">3</span><span data-i18n="cat.saft.name"></span></li>
        <li><span class="diagram__num">4</span><span data-i18n="cat.pervane.name"></span></li>
      </ol>
            <figcaption class="diagram__caption" data-i18n="hero.diagramCaption"></figcaption>
          </figure>
        </div>
      </li>
      <li class="step">
        <span class="step__badge" aria-hidden="true">3</span>
        <div class="step__body">
          <h2 class="step__title" data-i18n="guide.s3t">Ölçüyü nasıl alırım?</h2>
          <ul class="water-list">
            <li class="water"><span class="water__symbol">1</span><span data-i18n="guide.s3zn"></span></li>
            <li class="water"><span class="water__symbol">2</span><span data-i18n="guide.s3al"></span></li>
            <li class="water"><span class="water__symbol">3</span><span data-i18n="guide.s3mg"></span></li>
          </ul>
        </div>
      </li>
    </ol>
  </div>
</section>

<section class="section section--surface" aria-labelledby="bakim">
  <div class="u-container">
    <h2 class="u-visually-hidden" id="bakim">Tutya bakımı</h2>
    <div class="grid grid--2">
      <div class="notice">
        ${ico('i-clock', 22)}
        <span>
          <strong class="notice__title" data-i18n="guide.whenT">Ne zaman değiştirmeli?</strong>
          <span class="notice__text" data-i18n="guide.whenD"></span>
        </span>
      </div>
      <div class="notice notice--warning">
        ${ico('i-alert', 22)}
        <span>
          <strong class="notice__title" data-i18n="guide.warnT">Tutyayı boyamayın</strong>
          <span class="notice__text" data-i18n="guide.warnD"></span>
        </span>
      </div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="sor">
  <div class="u-container">
    <div class="section__head">
      <h2 class="section__title" id="sor" data-i18n="guide.askT">Hâlâ emin değil misiniz?</h2>
      <p class="section__lead" data-i18n="guide.askD"></p>
    </div>
    <a class="button button--whatsapp" data-wa-quick href="#" target="_blank" rel="noopener">
      ${ico('i-whatsapp', 20)}<span data-i18n="guide.askCta">WhatsApp'tan sorun</span>
    </a>
  </div>
</section>`;

/* ============ HAKKIMIZDA ============ */
const hakkimizda = `
<section class="section" aria-labelledby="hakkimizda-baslik">
  <div class="u-container split">
    <div>
      <p class="section__eyebrow" data-i18n="nav.about">Hakkımızda</p>
      <h1 class="section__title" id="hakkimizda-baslik" data-i18n="about.title">Döküm bizim işimiz</h1>
      <div class="prose">
        <p data-i18n-html="about.p1"></p>
        <p data-i18n-html="about.p2"></p>
        <p data-i18n-html="about.p3"></p>
      </div>
      <ul class="contact-list" style="margin-block-start: var(--spacing-32)">
        <li class="contact-list__item">${ico('i-check', 20)}<span><strong data-i18n="about.v1t">Doğru malzeme</strong><span data-i18n="about.v1d"></span></span></li>
        <li class="contact-list__item">${ico('i-ruler', 20)}<span><strong data-i18n="about.v2t">Ölçü tutmazsa çözeriz</strong><span data-i18n="about.v2d"></span></span></li>
        <li class="contact-list__item">${ico('i-info', 20)}<span><strong data-i18n="about.v3t">Açık fiyat</strong><span data-i18n="about.v3d"></span></span></li>
      </ul>
    </div>

    <dl class="fact-list">
      <div><dt class="fact-list__term" data-i18n="about.fTitle">Ünvan</dt><dd class="fact-list__desc" data-company-legal>KUT MARİN DÖKÜM - Hüseyin Okan Kut</dd></div>
      <div><dt class="fact-list__term" data-i18n="about.fAddress">Adres</dt><dd class="fact-list__desc" data-company-address>3267 Sokak No:8/A, Karabağlar, İzmir</dd></div>
      <div><dt class="fact-list__term" data-i18n="about.fPhone">Telefon</dt><dd class="fact-list__desc fact-list__desc--mono"><a data-company-phone-link href="tel:+905447329306"><span data-company-phone>0544 732 93 06</span></a></dd></div>
      <div><dt class="fact-list__term" data-i18n="about.fTax">Vergi dairesi</dt><dd class="fact-list__desc" data-company-tax-office>Kadifekale V.D.</dd></div>
      <div><dt class="fact-list__term" data-i18n="about.fTaxNo">Vergi numarası</dt><dd class="fact-list__desc fact-list__desc--mono" data-company-tax-no>338 838 170 90</dd></div>
    </dl>
  </div>
</section>`;

/* ============ İLETİŞİM ============ */
const iletisim = `
<section class="section" aria-labelledby="iletisim-baslik">
  <div class="u-container split">
    <div>
      <p class="section__eyebrow" data-i18n="nav.contact">İletişim</p>
      <h1 class="section__title" id="iletisim-baslik" data-i18n="contact.title">Bize ulaşın</h1>
      <p class="section__lead" data-i18n="contact.lead"></p>
      <div class="hero__actions" style="margin-block-start: var(--spacing-24)">
        <a class="button button--whatsapp" data-wa-quick href="#" target="_blank" rel="noopener">
          ${ico('i-whatsapp', 20)}<span data-i18n="contact.whatsapp">WhatsApp'tan yazın</span>
        </a>
        <a class="button button--secondary" data-company-phone-link href="tel:+905447329306">
          ${ico('i-phone', 20)}<span data-i18n="contact.call">Telefonla arayın</span>
        </a>
      </div>
    </div>

    <ul class="contact-list">
      <li class="contact-list__item">${ico('i-phone', 20)}<span>
        <strong data-i18n="about.fPhone">Telefon</strong>
        <a data-company-phone-link href="tel:+905447329306"><span data-company-phone>0544 732 93 06</span></a>
      </span></li>
      <li class="contact-list__item">${ico('i-pin', 20)}<span>
        <strong data-i18n="contact.address">Adres</strong>
        <span data-company-address>3267 Sokak No:8/A, Karabağlar, İzmir</span>
      </span></li>
      <li class="contact-list__item">${ico('i-clock', 20)}<span>
        <strong data-i18n="contact.hours">Çalışma saatleri</strong>
        <span data-i18n="contact.hoursValue"></span>
        <span class="cart-note" data-i18n="contact.hoursNote"></span>
      </span></li>
      <li class="contact-list__item">${ico('i-info', 20)}<span>
        <strong data-i18n="about.fTitle">Ünvan</strong>
        <span data-company-legal>KUT MARİN DÖKÜM - Hüseyin Okan Kut</span>
      </span></li>
    </ul>
  </div>
</section>`;

/* ---------- Yaz ---------- */
const files = {
  'index.html':      page(T, D, index),
  'urunler.html':    page(`Ürünler · ${T}`, 'Şaft, Venus, demirli, UFO, pervane, Max Prop, bow thruster, kuyruk ve motor tutyaları ile dalgıç kurşunları. Çinko, alüminyum ve magnezyum seçenekleri.', urunler),
  'rehber.html':     page(`Tutya rehberi · ${T}`, 'Hangi tutya? Suya göre malzeme seçimi (çinko, alüminyum, magnezyum), ölçü alma ve değiştirme zamanı.', rehber),
  'hakkimizda.html': page(`Hakkımızda · ${T}`, 'KUT MARİN DÖKÜM - Hüseyin Okan Kut. İzmir Karabağlar\'da tutya ve döküm kurşun üretimi.', hakkimizda),
  'iletisim.html':   page(`İletişim · ${T}`, 'Kut Marin iletişim: 0544 732 93 06 · 3267 Sokak No:8/A, Karabağlar, İzmir.', iletisim),
};

Object.entries(files).forEach(([name, html]) => {
  fs.writeFileSync(path.join(ROOT, name), html);
  console.log(`  ${name.padEnd(18)} ${String(html.split('\n').length).padStart(4)} satir`);
});
console.log(`\n${Object.keys(files).length} sayfa uretildi.`);
