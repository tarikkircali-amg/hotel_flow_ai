/* ============================================================
   KUT MARİN — SİPARİŞ LİSTESİ VE WHATSAPP GÖNDERİMİ
   Sunucu yok, üyelik yok, ödeme alınmaz. Liste tarayıcıda durur;
   müşteri "gönder" dediğinde WhatsApp hazır mesajla açılır ve
   göndermeden önce mesajı görüp düzenleyebilir.
   ============================================================ */
(() => {
  'use strict';

  const BASE = document.documentElement.dataset.base || '';
  const STORAGE_KEY = 'kutmarin.cart';
  const WA_SAFE_LENGTH = 1900;   // bunun ustunde WhatsApp mesaji kesilebilir

  const store = {
    read() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
      catch { return []; }
    },
    write(items) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
      catch { /* kota dolu veya gizli mod — liste yalnizca bu oturumda yasar */ }
    },
  };

  let items = store.read();          // [{ sku, qty }]
  let company = null;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const totalCount = () => items.reduce((sum, item) => sum + item.qty, 0);

  /* ---------- Liste işlemleri ---------- */
  function add(sku, qty = 1) {
    const existing = items.find((item) => item.sku === sku);
    if (existing) existing.qty += qty;
    else items.push({ sku, qty });
    commit();
  }
  // Adet degisirken listeyi bastan cizmeyiz: odaklanmis <input> DOM'dan
  // kaldirilinca tarayici "node is no longer a child" hatasi veriyordu.
  // Yalnizca toplamlar, sayac ve WhatsApp baglantisi guncellenir.
  function setQty(sku, qty) {
    const item = items.find((i) => i.sku === sku);
    if (!item) return;
    item.qty = Math.max(1, Math.min(999, qty));
    commit({ redrawList: false });
  }
  function remove(sku) { items = items.filter((i) => i.sku !== sku); commit(); }
  function clear() { items = []; commit(); }

  function commit({ redrawList = true } = {}) {
    store.write(items);
    render({ redrawList });
    document.dispatchEvent(new CustomEvent('cart:changed', { detail: { count: totalCount() } }));
  }

  /* ---------- WhatsApp mesajı ---------- */
  function buildMessage() {
    const t = window.I18N.t;
    const catalog = window.Catalog;
    const lines = [t('wa.hello'), '', t('wa.header')];

    let known = 0;
    let askCount = 0;

    items.forEach((item, index) => {
      const product = catalog?.find(item.sku);
      if (!product) return;
      const name = catalog.name(product);
      if (product.price != null) {
        const sum = product.price * item.qty;
        known += sum;
        lines.push(`${index + 1}. ${name} (${product.sku}) x ${item.qty} — ${window.I18N.formatPrice(sum, catalog.currency)}`);
      } else {
        askCount += 1;
        lines.push(`${index + 1}. ${name} (${product.sku}) x ${item.qty} — ${t('product.priceAsk')}`);
      }
    });

    lines.push('');
    if (known > 0) {
      lines.push(`${t('wa.totalLine')}: ${window.I18N.formatPrice(known, catalog?.currency || 'TRY')} (${t('product.vat')})`);
    }
    if (askCount > 0) lines.push(`${t('wa.askLine')}: ${askCount}`);
    lines.push('', t('wa.footer'));

    return lines.join('\n');
  }

  const waLink = (text) =>
    `${company.whatsapp.base}${company.whatsapp.number}?text=${encodeURIComponent(text)}`;

  /* ---------- Çizim ---------- */
  function render({ redrawList = true } = {}) {
    const t = window.I18N.t;

    document.querySelectorAll('[data-cart-count]').forEach((node) => {
      const count = totalCount();
      node.textContent = String(count);
      node.hidden = count === 0;
    });

    const list = document.getElementById('cart-items');
    if (!list) return;

    const catalog = window.Catalog;
    if (redrawList) list.replaceChildren();

    const empty = document.getElementById('cart-empty');
    const foot = document.getElementById('cart-foot');
    if (!items.length || !catalog) {
      if (empty) empty.hidden = false;
      if (foot) foot.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (foot) foot.hidden = false;

    let known = 0;
    let askCount = 0;

    items.forEach((item) => {
      const product = catalog.find(item.sku);
      if (!product) return;

      if (!redrawList) {
        // Satirlar yerinde duruyor; yalnizca bu satirin tutarini tazeliyoruz.
        if (product.price != null) known += product.price * item.qty;
        else askCount += 1;
        const cell = list.querySelector(`[data-row="${CSS.escape(product.sku)}"] .cart-item__price`);
        if (cell && product.price != null) {
          cell.textContent = window.I18N.formatPrice(product.price * item.qty, catalog.currency);
        }
        return;
      }

      const row = el('li', 'cart-item');
      row.dataset.row = product.sku;

      const info = el('div', 'cart-item__info');
      info.append(el('p', 'cart-item__name', catalog.name(product)));
      info.append(el('p', 'cart-item__sku', product.sku));
      row.append(info);

      const qtyWrap = el('div', 'cart-item__qty');
      const label = el('label', 'u-visually-hidden', `${t('cart.qty')} — ${catalog.name(product)}`);
      const input = el('input', 'cart-item__input');
      const id = `qty-${product.sku.replace(/[^a-z0-9]/gi, '')}`;
      input.id = id; label.htmlFor = id;
      input.type = 'number'; input.min = '1'; input.max = '999'; input.step = '1';
      input.value = String(item.qty);
      input.inputMode = 'numeric';
      input.addEventListener('change', () => setQty(product.sku, parseInt(input.value, 10) || 1));
      qtyWrap.append(label, input);
      row.append(qtyWrap);

      const price = el('p', 'cart-item__price');
      if (product.price != null) {
        known += product.price * item.qty;
        price.textContent = window.I18N.formatPrice(product.price * item.qty, catalog.currency);
      } else {
        askCount += 1;
        price.classList.add('cart-item__price--ask');
        price.textContent = t('product.priceAsk');
      }
      row.append(price);

      const del = el('button', 'cart-item__remove');
      del.type = 'button';
      del.append(el('span', 'u-visually-hidden', `${t('cart.remove')} — ${catalog.name(product)}`));
      del.insertAdjacentHTML('beforeend',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>');
      del.addEventListener('click', () => remove(product.sku));
      row.append(del);

      list.append(row);
    });

    const totalNode = document.getElementById('cart-total');
    if (totalNode) {
      totalNode.textContent = known > 0
        ? window.I18N.formatPrice(known, catalog.currency) : '—';
    }
    const askNode = document.getElementById('cart-ask');
    if (askNode) {
      askNode.hidden = askCount === 0;
      askNode.textContent = `${askCount} ${t('cart.ask')}`;
    }

    const send = document.getElementById('cart-send');
    const warn = document.getElementById('cart-toolong');
    if (send) {
      const message = buildMessage();
      const href = waLink(message);
      send.href = href;
      if (warn) warn.hidden = href.length <= WA_SAFE_LENGTH;
    }
  }

  /* ---------- Çekmece ---------- */
  function initDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const openers = document.querySelectorAll('[data-cart-open]');
    const closers = document.querySelectorAll('[data-cart-close]');
    if (!drawer) return;

    let lastFocused = null;
    const setOpen = (open) => {
      drawer.hidden = !open;
      document.body.classList.toggle('has-drawer', open);
      openers.forEach((b) => b.setAttribute('aria-expanded', String(open)));
      if (open) {
        lastFocused = document.activeElement;
        drawer.querySelector('[data-cart-close]')?.focus();
      } else if (lastFocused) {
        lastFocused.focus();
      }
    };

    setOpen(false);
    openers.forEach((b) => b.addEventListener('click', () => setOpen(true)));
    closers.forEach((b) => b.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !drawer.hidden) setOpen(false);
    });
    drawer.addEventListener('click', (event) => {
      if (event.target === drawer) setOpen(false);
    });

    const clearButton = document.getElementById('cart-clear');
    if (clearButton) clearButton.addEventListener('click', clear);
  }

  /* ---------- Hızlı WhatsApp bağlantıları ---------- */
  function initQuickLinks() {
    document.querySelectorAll('[data-wa-quick]').forEach((link) => {
      link.href = waLink(window.I18N.t('wa.quick'));
    });
    document.querySelectorAll('[data-company-phone-link]').forEach((link) => {
      link.href = `tel:${company.phone.tel}`;
    });
    document.querySelectorAll('[data-company-phone]').forEach((node) => {
      node.textContent = company.phone.display;
    });
    document.querySelectorAll('[data-company-address]').forEach((node) => {
      node.textContent = company.address.full;
    });
    document.querySelectorAll('[data-company-legal]').forEach((node) => {
      node.textContent = company.legalName;
    });
    document.querySelectorAll('[data-company-tax-office]').forEach((node) => {
      node.textContent = company.tax.office;
    });
    document.querySelectorAll('[data-company-tax-no]').forEach((node) => {
      node.textContent = company.tax.number;
    });
  }

  async function init() {
    await window.I18N.ready;
    try {
      const response = await fetch(`${BASE}assets/data/company.json`, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`company.json ${response.status}`);
      company = await response.json();
    } catch (error) {
      console.error('[sepet]', error.message);
      return;
    }

    window.Cart = { add, remove, setQty, clear, get items() { return [...items]; }, buildMessage };

    initDrawer();
    initQuickLinks();
    render();

    document.addEventListener('catalog:ready', render);
    document.addEventListener('i18n:changed', () => { initQuickLinks(); render(); });
  }

  init();
})();
