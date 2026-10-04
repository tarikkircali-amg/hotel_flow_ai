/* ============================================================
   KUT MARİN — ÇOK DİLLİ ALTYAPI
   9 dil: tr, en, de, ru, ar (RTL), fr, it, es, el
   Sözlükler assets/i18n/<kod>.json dosyalarından çalışma anında okunur.
   Çeviri eksikse anahtar sessizce boş kalmaz: Türkçe karşılığına düşer.
   ============================================================ */
(() => {
  'use strict';

  const LANGS = ['tr', 'en', 'de', 'ru', 'ar', 'fr', 'it', 'es', 'el'];
  const FALLBACK = 'tr';
  const STORAGE_KEY = 'kutmarin.lang';
  const BASE = document.documentElement.dataset.base || '';

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* gizli mod */ } },
  };

  const cache = new Map();
  let current = FALLBACK;
  let dict = {};
  let fallbackDict = {};

  /* ---------- Sözlük yükleme ---------- */
  async function load(lang) {
    if (cache.has(lang)) return cache.get(lang);
    const response = await fetch(`${BASE}assets/i18n/${lang}.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`${lang} sözlüğü yüklenemedi (${response.status})`);
    const data = await response.json();
    cache.set(lang, data);
    return data;
  }

  /* ---------- Anahtar çözümleme: "cat.saft.name" ---------- */
  const lookup = (source, key) =>
    key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), source);

  function t(key, fallbackText = '') {
    const value = lookup(dict, key);
    if (typeof value === 'string') return value;
    const base = lookup(fallbackDict, key);
    if (typeof base === 'string') return base;
    return fallbackText || key;
  }

  /* ---------- Hangi dille açılmalı ---------- */
  function detect() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl && LANGS.includes(fromUrl)) return fromUrl;
    const saved = store.get(STORAGE_KEY);
    if (saved && LANGS.includes(saved)) return saved;
    for (const candidate of navigator.languages || [navigator.language || '']) {
      const code = String(candidate).toLowerCase().split('-')[0];
      if (LANGS.includes(code)) return code;
    }
    return FALLBACK;
  }

  /* ---------- Metinleri sayfaya uygula ---------- */
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n, el.textContent);
    });
    root.querySelectorAll('[data-i18n-html]').forEach((el) => {
      // Sözlükler bizim yazdığımız yerel dosyalardır; kullanıcı girdisi buraya girmez.
      el.innerHTML = t(el.dataset.i18nHtml, el.innerHTML);
    });
    root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(',').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
  }

  /* ---------- Dili değiştir ---------- */
  async function setLang(lang, { persist = true } = {}) {
    const target = LANGS.includes(lang) ? lang : FALLBACK;
    try {
      dict = await load(target);
    } catch (error) {
      console.error('[i18n]', error.message);
      if (target === FALLBACK) return;          // yedek de yüklenemiyorsa sayfayı olduğu gibi bırak
      return setLang(FALLBACK, { persist: false });
    }
    current = target;
    if (persist) store.set(STORAGE_KEY, target);

    const dir = dict.meta?.dir === 'rtl' ? 'rtl' : 'ltr';
    document.documentElement.lang = target;
    document.documentElement.dir = dir;
    document.documentElement.dataset.lang = target;

    apply();
    syncSwitcher();
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: target, dir } }));
  }

  /* ---------- Dil seçici ---------- */
  function syncSwitcher() {
    document.querySelectorAll('[data-lang-select]').forEach((select) => {
      select.value = current;
    });
  }

  async function buildSwitcher() {
    const selects = document.querySelectorAll('[data-lang-select]');
    if (!selects.length) return;
    // Her dilin adını KENDİ dilinde göstermek için tüm meta bilgilerini okuruz.
    const names = await Promise.all(LANGS.map(async (code) => {
      try { return [code, (await load(code)).meta.name]; } catch { return [code, code.toUpperCase()]; }
    }));
    selects.forEach((select) => {
      select.innerHTML = names
        .map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
      select.value = current;
      select.addEventListener('change', (event) => setLang(event.target.value));
    });
  }

  /* ---------- Sayı ve para biçimi ---------- */
  function formatPrice(value, currency = 'TRY') {
    const locale = dict.meta?.locale || 'tr-TR';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency', currency, maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${value} ${currency}`;
    }
  }

  window.I18N = {
    t, setLang, apply, formatPrice,
    get lang() { return current; },
    get dir() { return dict.meta?.dir || 'ltr'; },
    get locale() { return dict.meta?.locale || 'tr-TR'; },
    languages: LANGS,
    ready: null,
  };

  window.I18N.ready = (async () => {
    try { fallbackDict = await load(FALLBACK); } catch { /* yedek yoksa t() anahtarı döner */ }
    await setLang(detect(), { persist: false });
    await buildSwitcher();
  })();
})();
