/* ============================================================
   KUT MARİN — GENEL SAYFA DAVRANIŞLARI
   Tema, mobil menü, yıl. JavaScript kapalıyken sayfa yine okunur.
   ============================================================ */
(() => {
  'use strict';

  const THEME_KEY = 'kutmarin.theme';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* yoksay */ } },
  };

  /* ---------- Tema ---------- */
  function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    const icon = toggle.querySelector('[data-theme-icon] use');
    const label = toggle.querySelector('.u-visually-hidden');

    const apply = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      const dark = theme === 'dark';
      toggle.setAttribute('aria-pressed', String(dark));
      if (icon) icon.setAttribute('href', dark ? '#i-sun' : '#i-moon');
      if (label) label.textContent = window.I18N
        ? window.I18N.t(dark ? 'a11y.themeLight' : 'a11y.themeDark')
        : (dark ? 'Açık tema' : 'Koyu tema');
    };

    apply(document.documentElement.getAttribute('data-theme') || 'light');
    toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      store.set(THEME_KEY, next);
    });
    document.addEventListener('i18n:changed', () =>
      apply(document.documentElement.getAttribute('data-theme') || 'light'));
  }

  /* ---------- Mobil menü ---------- */
  function initNav() {
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    const label = toggle.querySelector('.u-visually-hidden');

    const setOpen = (open) => {
      nav.setAttribute('data-open', String(open));
      toggle.setAttribute('aria-expanded', String(open));
      if (label && window.I18N) {
        label.textContent = window.I18N.t(open ? 'a11y.menuClose' : 'a11y.menuOpen');
      }
    };

    setOpen(false);
    toggle.addEventListener('click', () =>
      setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false); toggle.focus();
      }
    });
    document.addEventListener('i18n:changed', () =>
      setOpen(toggle.getAttribute('aria-expanded') === 'true'));
  }

  /* ---------- Bulunulan sayfayı menüde işaretle ---------- */
  function markCurrentPage() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav__link').forEach((link) => {
      const target = link.getAttribute('href').split('?')[0].split('/').pop();
      if (target === page) link.setAttribute('aria-current', 'page');
    });
  }

  initTheme();
  initNav();
  markCurrentPage();

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
