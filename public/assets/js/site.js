/* ============================================================
   HOTELFLOW AI — SITE DAVRANISLARI
   Progressive enhancement: JS olmadan da sayfa okunur ve form gonderilir.
   ============================================================ */
(() => {
  'use strict';

  const CONFIG = {
    themeStorageKey: 'hotelflow.theme',
    draftStorageKey: 'hotelflow.contact-draft',
    contactEndpoint: '/api/contact',
    draftSaveDelayMs: 400,
    scrollSpyMargin: '-45% 0px -50% 0px',
  };

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* kota/gizli mod */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* yoksay */ } },
  };

  /* ---------- Tema ---------- */
  function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    const icon = toggle.querySelector('[data-theme-icon] use');
    const label = toggle.querySelector('.u-visually-hidden');
    const saved = store.get(CONFIG.themeStorageKey);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const apply = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      const isDark = theme === 'dark';
      toggle.setAttribute('aria-pressed', String(isDark));
      if (icon) icon.setAttribute('href', isDark ? '#i-sun' : '#i-moon');
      if (label) label.textContent = isDark ? 'Açık temayı aç' : 'Koyu temayı aç';
    };

    apply(saved || (systemPrefersDark ? 'dark' : 'light'));

    toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      store.set(CONFIG.themeStorageKey, next);
    });
  }

  /* ---------- Mobil menu ---------- */
  function initNav() {
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;

    const label = toggle.querySelector('.u-visually-hidden');
    const setOpen = (open) => {
      nav.setAttribute('data-open', String(open));
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Menüyü kapat' : 'Menüyü aç';
    };

    setOpen(false);
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (event) => { if (event.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
      setOpen(false);
      toggle.focus();
    });
  }

  /* ---------- SSS akordiyonu ---------- */
  function initFaq() {
    document.querySelectorAll('.faq__question').forEach((button) => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) return;
      button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
      });
    });
  }

  /* ---------- Menude bulunulan bolumu isaretle ---------- */
  function initScrollSpy() {
    const links = [...document.querySelectorAll('.site-nav__link[href^="#"]')];
    const sections = links
      .map((link) => ({ link, section: document.querySelector(link.hash) }))
      .filter((pair) => pair.section);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        links.forEach((link) => link.removeAttribute('aria-current'));
        const match = sections.find((pair) => pair.section === entry.target);
        if (match) match.link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: CONFIG.scrollSpyMargin });

    sections.forEach((pair) => observer.observe(pair.section));
  }

  /* ---------- Form dogrulama kurallari ---------- */
  const RULES = {
    name: (value) => (value.trim().length >= 2
      ? '' : 'Adınızı ve soyadınızı yazın; size nasıl hitap edeceğimizi bilmemiz gerekiyor.'),
    hotel: (value) => (value.trim().length >= 2
      ? '' : 'Otelinizin adını yazın. Demoyu sizin tesisinize göre hazırlıyoruz.'),
    email: (value) => {
      if (!value.trim()) return 'E-posta adresinizi yazın; dönüşü buraya yapacağız.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
        ? '' : 'E-posta adresi eksik görünüyor. “ad@otel.com” biçiminde yazın.';
    },
    consent: (_value, field) => (field.checked
      ? '' : 'Talebinizi işleyebilmemiz için bu onay gerekli. Kutuyu işaretleyin.'),
  };

  function showFieldError(field, message) {
    const wrapper = field.closest('[data-field]');
    const error = wrapper?.querySelector('.field__error');
    if (wrapper) wrapper.setAttribute('data-invalid', String(Boolean(message)));
    field.setAttribute('aria-invalid', String(Boolean(message)));
    if (!error) return;
    error.hidden = !message;
    const text = error.querySelector('span');
    if (text) text.textContent = message;
  }

  function validateField(field) {
    const rule = RULES[field.name];
    if (!rule) return true;
    const message = rule(field.value ?? '', field);
    showFieldError(field, message);
    return !message;
  }

  /* ---------- Durum mesaji ---------- */
  function createStatusReporter(form) {
    const box = form.querySelector('#form-status');
    const text = box?.querySelector('[data-status-text]');
    const icon = box?.querySelector('[data-status-icon] use');
    return (variant, message) => {
      if (!box || !text) return;
      if (!message) { box.hidden = true; return; }
      box.hidden = false;
      box.setAttribute('data-variant', variant);
      text.textContent = message;
      if (icon) icon.setAttribute('href', variant === 'success' ? '#i-check-circle' : '#i-alert');
    };
  }

  /* ---------- Taslak kaydi ----------
     Rizayi (onay kutusu) asla saklamayiz: her gonderimde acikca verilmelidir.
     Basarili gonderimden sonra taslak tamamen silinir — misafir verisi
     tarayicida kalmaz (KVKK). Bekleyen kayit zamanlayicisi da iptal edilir,
     aksi halde silmeden sonra tetiklenip veriyi geri yazar.                     */
  function initDraft(form) {
    const fields = [...form.elements]
      .filter((el) => el.name && el.type !== 'checkbox' && el.type !== 'submit');
    let timer;

    try {
      const draft = JSON.parse(store.get(CONFIG.draftStorageKey) || '{}');
      fields.forEach((field) => { if (draft[field.name]) field.value = draft[field.name]; });
    } catch { store.remove(CONFIG.draftStorageKey); }

    const save = () => {
      const draft = {};
      fields.forEach((field) => { if (field.value) draft[field.name] = field.value; });
      // Bos taslak yazmayiz; aksi halde geride anlamsiz bir kayit kalir.
      if (Object.keys(draft).length) store.set(CONFIG.draftStorageKey, JSON.stringify(draft));
      else store.remove(CONFIG.draftStorageKey);
    };

    form.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(save, CONFIG.draftSaveDelayMs);
    });

    return { clear() { clearTimeout(timer); store.remove(CONFIG.draftStorageKey); } };
  }

  /* ---------- Sunucu yanitini mesaja cevir ---------- */
  function messageForResponse(status, payload) {
    if (status === 201) {
      return ['success', payload.message
        || 'Talebiniz bize ulaştı. Bir iş günü içinde e-posta ile dönüş yapacağız.'];
    }
    if (status === 400) {
      return ['danger', payload.error
        || 'Formda eksik ya da hatalı bir alan var. Alanları kontrol edip tekrar gönderin.'];
    }
    if (status === 429) {
      return ['danger', payload.error
        || 'Kısa sürede çok fazla talep gönderildi. Birkaç dakika sonra tekrar deneyin.'];
    }
    return ['danger',
      'Talebiniz kaydedilemedi; sorun bizde. Doğrudan info@inovatifzeka.com adresine yazabilirsiniz — '
      + 'yazdıklarınız formda duruyor, kaybolmadı.'];
  }

  /* ---------- Form gonderimi ---------- */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const submit = document.getElementById('form-submit');
    const report = createStatusReporter(form);
    const validated = new Set();
    const draft = initDraft(form);

    form.addEventListener('blur', (event) => {
      const field = event.target;
      if (!field.name || !RULES[field.name]) return;
      validated.add(field.name);
      validateField(field);
    }, true);

    form.addEventListener('input', (event) => {
      const field = event.target;
      if (field.name && validated.has(field.name)) validateField(field);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const checked = [...form.elements].filter((el) => el.name && RULES[el.name]);
      checked.forEach((field) => validated.add(field.name));
      const invalid = checked.filter((field) => !validateField(field));

      if (invalid.length) {
        report('danger', `${invalid.length} alan düzeltilmeli. İlk eksik alana götürdük.`);
        invalid[0].focus();
        return;
      }

      submit.setAttribute('aria-disabled', 'true');
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'Gönderiliyor…';
      report('success', 'Talebiniz gönderiliyor…');

      try {
        const body = Object.fromEntries(new FormData(form).entries());
        body.consent = form.elements.consent.checked;

        const response = await fetch(CONFIG.contactEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => ({}));
        const [variant, message] = messageForResponse(response.status, payload);
        report(variant, message);

        if (variant === 'success') {
          form.reset();
          draft.clear();
          [...form.elements].forEach((el) => el.name && showFieldError(el, ''));
        }
      } catch {
        report('danger',
          'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar gönderin; '
          + 'yazdıklarınız kayıtlı.');
      } finally {
        submit.removeAttribute('aria-disabled');
        submit.removeAttribute('aria-busy');
        submit.textContent = 'Demo talep et';
      }
    });
  }

  /* ---------- Baslat ---------- */
  initTheme();
  initNav();
  initFaq();
  initScrollSpy();
  initContactForm();

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
