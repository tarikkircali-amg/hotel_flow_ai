// Kreatif önizleme ve indirme (SVG doğrudan, PNG tarayıcıda canvas ile).
import { toast } from './panels.js';

export const FORMATS = [
  { id: 'square', label: '1:1 Feed', w: 1080, h: 1080 },
  { id: 'story', label: '9:16 Story', w: 1080, h: 1920 },
  { id: 'wide', label: '16:9 Web', w: 1920, h: 1080 },
];

export function creativesHTML(campaignId) {
  return `<div class="creatives" aria-label="Reklam kreatifleri">${FORMATS.map((f) => `
    <figure class="creative">
      <img src="/api/campaigns/${campaignId}/creative/${f.id}.svg" alt="${f.label} reklam görseli" loading="lazy" style="aspect-ratio:${f.w}/${f.h}">
      <figcaption>${f.label}
        <span><a class="btn btn-sm" href="/api/campaigns/${campaignId}/creative/${f.id}.svg?download=1" download>SVG</a>
        <button class="btn btn-sm" type="button" data-png="${f.id}">PNG</button></span></figcaption>
    </figure>`).join('')}</div>`;
}

export async function downloadPng(campaignId, formatId) {
  const f = FORMATS.find((x) => x.id === formatId);
  try {
    const svg = await fetch(`/api/campaigns/${campaignId}/creative/${f.id}.svg`, { credentials: 'same-origin' }).then((r) => {
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
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `kampanya-${campaignId}-${f.id}.png` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch {
    toast('PNG oluşturulamadı. SVG olarak indirip tekrar deneyin.');
  }
}
