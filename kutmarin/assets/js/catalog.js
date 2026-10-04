/* ============================================================
   KUT MARİN — ÜRÜN KATALOĞU
   Tek veri kaynağı: assets/data/products.json
   Ürün adı = kategori adı (i18n) + ölçü + model kodu → katalog
   dil değişince baştan çizilir, ayrı çeviri dosyası gerekmez.
   ============================================================ */
(() => {
  'use strict';

  const BASE = document.documentElement.dataset.base || '';
  const state = { data: null, group: 'all', material: 'all' };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  /* ---------- Ürün adı ve rozetleri ---------- */
  const productName = (product) => {
    const name = window.I18N.t(`cat.${product.category}.name`);
    return product.size ? `${name} ${product.size}` : name;
  };

  function materialBadges(categoryId) {
    const category = state.data.categories.find((c) => c.id === categoryId);
    return (category?.materials || []).map((code) => {
      const badge = el('span', `badge badge--material badge--${code}`);
      badge.append(el('span', 'badge__symbol', window.I18N.t(`material.${code}`).match(/\(([^)]+)\)/)?.[1] || code));
      badge.append(el('span', null, window.I18N.t(`material.${code}Water`)));
      return badge;
    });
  }

  function stockBadge(stock) {
    const badge = el('span', `badge badge--stock badge--stock-${stock}`);
    badge.append(el('span', 'badge__dot'));
    badge.append(el('span', null, window.I18N.t(`stock.${stock}`)));
    return badge;
  }

  /* ---------- Tek ürün kartı ---------- */
  function productCard(product) {
    const category = state.data.categories.find((c) => c.id === product.category);
    const card = el('li', 'card product');

    const figure = el('figure', 'product__media');
    const img = el('img');
    img.src = `${BASE}assets/img/${category.drawing}.svg`;
    img.alt = window.I18N.t(`cat.${product.category}.name`);
    img.loading = 'lazy';
    img.width = 400; img.height = 300;
    figure.append(img);
    card.append(figure);

    const body = el('div', 'product__body');
    body.append(el('h3', 'product__title', productName(product)));

    const meta = el('p', 'product__meta');
    meta.append(el('span', 'product__sku', product.sku));
    if (product.brand) meta.append(el('span', 'product__brand', product.brand));
    body.append(meta);

    body.append(el('p', 'product__desc', window.I18N.t(`cat.${product.category}.desc`)));

    const badges = el('div', 'product__badges');
    materialBadges(product.category).forEach((b) => badges.append(b));
    badges.append(stockBadge(product.stock));
    body.append(badges);

    const foot = el('div', 'product__foot');
    const price = el('p', 'product__price');
    if (product.price != null) {
      price.append(el('span', 'product__amount', window.I18N.formatPrice(product.price, state.data.currency)));
      price.append(el('span', 'product__vat', window.I18N.t('product.vat')));
    } else {
      price.classList.add('product__price--ask');
      price.append(el('span', null, window.I18N.t('product.priceAsk')));
    }
    foot.append(price);

    const button = el('button', 'button button--secondary product__add', window.I18N.t('product.add'));
    button.type = 'button';
    button.dataset.sku = product.sku;
    button.addEventListener('click', () => {
      window.Cart.add(product.sku);
      button.textContent = window.I18N.t('product.added');
      button.classList.add('is-added');
      setTimeout(() => {
        button.textContent = window.I18N.t('product.add');
        button.classList.remove('is-added');
      }, 1600);
    });
    foot.append(button);
    body.append(foot);

    card.append(body);
    return card;
  }

  /* ---------- Filtreler ---------- */
  function matches(product) {
    const category = state.data.categories.find((c) => c.id === product.category);
    if (state.group !== 'all' && category.group !== state.group) return false;
    if (state.material !== 'all' && !(category.materials || []).includes(state.material)) return false;
    return true;
  }

  function renderGrid() {
    const grid = document.getElementById('product-grid');
    const count = document.getElementById('product-count');
    if (!grid) return;

    const list = state.data.products.filter(matches);
    grid.replaceChildren();

    if (!list.length) {
      const empty = el('li', 'empty-state');
      empty.append(el('p', 'empty-state__title', window.I18N.t('product.noMatch')));
      empty.append(el('p', 'empty-state__text', window.I18N.t('product.noMatchHelp')));
      grid.append(empty);
    } else {
      list.forEach((product) => grid.append(productCard(product)));
    }
    if (count) count.textContent = `${list.length} ${window.I18N.t('filter.results')}`;
  }

  function renderFilters() {
    const groupWrap = document.getElementById('filter-group');
    const materialWrap = document.getElementById('filter-material');
    if (!groupWrap || !materialWrap) return;

    const groups = ['all', ...new Set(state.data.categories.map((c) => c.group))];
    const materials = ['all', 'zn', 'al', 'mg'];

    const build = (wrap, values, key, labelFor) => {
      wrap.replaceChildren();
      values.forEach((value) => {
        const button = el('button', 'chip', labelFor(value));
        button.type = 'button';
        button.setAttribute('aria-pressed', String(state[key] === value));
        button.addEventListener('click', () => {
          state[key] = value;
          renderFilters();
          renderGrid();
        });
        wrap.append(button);
      });
    };

    build(groupWrap, groups, 'group',
      (v) => (v === 'all' ? window.I18N.t('filter.all') : window.I18N.t(`group.${v}`)));
    build(materialWrap, materials, 'material',
      (v) => (v === 'all' ? window.I18N.t('filter.all') : window.I18N.t(`material.${v}`)));
  }

  /* ---------- Ana sayfadaki grup kartları ---------- */
  function renderGroups() {
    const wrap = document.getElementById('group-grid');
    if (!wrap) return;
    wrap.replaceChildren();

    const groups = [...new Set(state.data.categories.map((c) => c.group))];
    groups.forEach((group) => {
      const categories = state.data.categories.filter((c) => c.group === group);
      const sample = categories[0];
      const item = el('li', 'card group-card');

      const link = el('a', 'group-card__link');
      link.href = `${BASE}urunler.html?group=${encodeURIComponent(group)}`;

      const figure = el('figure', 'group-card__media');
      const img = el('img');
      img.src = `${BASE}assets/img/${sample.drawing}.svg`;
      img.alt = window.I18N.t(`cat.${sample.id}.name`);
      img.loading = 'lazy'; img.width = 400; img.height = 300;
      figure.append(img);
      link.append(figure);

      link.append(el('h3', 'group-card__title', window.I18N.t(`group.${group}`)));
      link.append(el('p', 'group-card__list',
        categories.map((c) => window.I18N.t(`cat.${c.id}.name`)).join(' · ')));
      item.append(link);
      wrap.append(item);
    });
  }

  /* ---------- Başlat ---------- */
  async function init() {
    await window.I18N.ready;
    try {
      const response = await fetch(`${BASE}assets/data/products.json`, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`products.json ${response.status}`);
      state.data = await response.json();
    } catch (error) {
      console.error('[katalog]', error.message);
      document.querySelectorAll('[data-catalog-error]').forEach((node) => { node.hidden = false; });
      return;
    }

    window.Catalog = {
      find: (sku) => state.data.products.find((p) => p.sku === sku),
      name: productName,
      currency: state.data.currency,
      data: state.data,
    };
    document.dispatchEvent(new CustomEvent('catalog:ready'));

    const fromUrl = new URLSearchParams(location.search).get('group');
    if (fromUrl) state.group = fromUrl;

    renderGroups(); renderFilters(); renderGrid();
    document.addEventListener('i18n:changed', () => {
      renderGroups(); renderFilters(); renderGrid();
    });

    const clear = document.getElementById('filter-clear');
    if (clear) clear.addEventListener('click', () => {
      state.group = 'all'; state.material = 'all';
      renderFilters(); renderGrid();
    });
  }

  init();
})();
