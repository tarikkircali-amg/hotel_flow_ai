// Kreatif önizleme ve indirme (SVG sunucudan, PNG tarayıcıda canvas ile), dile göre.
import { toast, askConfirm } from './panels.js';

export const FORMATS = [
  { id: 'square', label: '1:1 Feed', w: 1080, h: 1080 },
  { id: 'story', label: '9:16 Story', w: 1080, h: 1920 },
  { id: 'wide', label: '16:9 Web', w: 1920, h: 1080 },
];

// MOS_CREATIVE_SRC: yalnızca sunucusuz tarayıcı demosunda tanımlıdır (görseli doğrudan üretir).
const src = (id, f, lang, bust = '') => window.MOS_CREATIVE_SRC?.(id, f, lang)
  ?? `/api/campaigns/${id}/creative/${f}.svg?lang=${lang}${bust}`;

// langs: [{code, native, name}] — bu kampanyanın dilleri
export function creativesHTML(campaignId, langs, { imageEnabled }) {
  return `<section class="creatives-box" aria-label="Reklam kreatifleri">
    <div class="card-row">
      <label class="field inline"><span>Dil</span><select data-creative-lang>
        ${langs.map((l) => `<option value="${l.code}">${l.native} — ${l.name}</option>`).join('')}</select></label>
      ${imageEnabled
        ? '<button class="btn btn-sm" type="button" data-gen-image>🖼️ AI görsel üret</button>'
        : '<span class="muted">🖼️ AI görsel için sunucuda <code>MOS_IMAGE_PROVIDER</code> tanımlayın.</span>'}
    </div>
    <div class="creatives">${FORMATS.map((f) => `
      <figure class="creative">
        <img data-f="${f.id}" src="${src(campaignId, f.id, langs[0].code)}" alt="${f.label} reklam görseli" loading="lazy" style="aspect-ratio:${f.w}/${f.h}">
        <figcaption>${f.label}
          <span><a class="btn btn-sm" data-svg="${f.id}" href="${src(campaignId, f.id, langs[0].code)}&download=1" download>SVG</a>
          <button class="btn btn-sm" type="button" data-png="${f.id}">PNG</button></span></figcaption>
      </figure>`).join('')}</div></section>`;
}

export function bindCreatives(root, campaignId, api) {
  const box = root.querySelector('.creatives-box');
  if (!box) return;
  const langSel = box.querySelector('[data-creative-lang]');
  const refresh = (bust = '') => {
    box.querySelectorAll('img[data-f]').forEach((img) => { img.src = src(campaignId, img.dataset.f, langSel.value, bust); });
    box.querySelectorAll('[data-svg]').forEach((a) => { a.href = `${src(campaignId, a.dataset.svg, langSel.value)}&download=1`; });
  };
  langSel.addEventListener('change', () => refresh());
  box.querySelectorAll('[data-png]').forEach((b) => b.addEventListener('click', () => downloadPng(campaignId, b.dataset.png, langSel.value)));
  box.querySelector('[data-gen-image]')?.addEventListener('click', async (e) => {
    if (!await askConfirm('Görsel üretim servisi kullanılacak; ücretli olabilir.', { title: 'AI görsel üretilsin mi?', ok: '🖼️ Üret' })) return;
    e.target.disabled = true; e.target.textContent = '🖌️ Pelin boyuyor…';
    try { await api(`/campaigns/${campaignId}/image`, { method: 'POST' }); refresh(`&t=${Date.now()}`); toast('Görsel hazır ve kreatiflere eklendi 🖼️'); }
    catch (err) { toast(err.message); }
    e.target.disabled = false; e.target.textContent = '🖼️ Yeniden üret';
  });
}

export async function downloadPng(campaignId, formatId, lang) {
  const f = FORMATS.find((x) => x.id === formatId);
  try {
    const svg = await fetch(src(campaignId, f.id, lang), { credentials: 'same-origin' }).then((r) => {
      if (!r.ok) throw new Error();
      return r.text();
    });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = url; });
    const canvas = Object.assign(document.createElement('canvas'), { width: f.w, height: f.h });
    canvas.getContext('2d').drawImage(img, 0, 0, f.w, f.h);
    URL.revokeObjectURL(url);
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `kampanya-${campaignId}-${lang}-${f.id}.png` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch {
    toast('PNG oluşturulamadı. SVG olarak indirip tekrar deneyin.');
  }
}
