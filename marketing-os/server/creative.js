// Reklam kreatifi üretimi: Tasarımcının maket verisinden 3 formatta SVG.
// Harici servis yok; renkler WCAG AA kontrastına zorlanır.
const FORMATS = {
  square: { w: 1080, h: 1080, label: '1:1 (feed)' },
  story: { w: 1080, h: 1920, label: '9:16 (story/reels)' },
  wide: { w: 1920, h: 1080, label: '16:9 (YouTube/web)' },
};
const HEX = /^#[0-9a-fA-F]{6}$/;
const FONT = "Nunito, 'Segoe UI', Arial, sans-serif";

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const bestText = (bg) => (contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111');

// Renkleri doğrula; metin/arka plan AA (4.5:1) değilse okunur renge düş.
function palette(v = {}) {
  const bg = HEX.test(v.bg) ? v.bg : '#0f172a';
  let fg = HEX.test(v.fg) ? v.fg : bestText(bg);
  if (contrast(fg, bg) < 4.5) fg = bestText(bg);
  const accent = HEX.test(v.accent) ? v.accent : '#f59e0b';
  return { bg, fg, accent, ctaText: bestText(accent) };
}

// Basit satır kırma: ortalama karakter genişliği ≈ 0.55 × punto.
function wrap(text, fontSize, width, maxLines) {
  const perLine = Math.max(6, Math.floor(width / (fontSize * 0.55)));
  const lines = [];
  let cur = '';
  for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > perLine && cur) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return kept;
  }
  return lines;
}

function textBlock(lines, { x, y, size, weight, fill, lh = 1.12 }) {
  return lines.map((l, i) =>
    `<text x="${x}" y="${Math.round(y + i * size * lh)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(l)}</text>`).join('');
}

function layout(fmt, w, h) {
  if (fmt === 'wide') return { pad: 120, textW: w * 0.55, hs: 104, ss: 44, top: h * 0.32, maxH: 3 };
  if (fmt === 'story') return { pad: 96, textW: w - 192, hs: 118, ss: 50, top: h * 0.42, maxH: 5 };
  return { pad: 96, textW: w - 192, hs: 96, ss: 44, top: h * 0.36, maxH: 4 };
}

function renderCreative(visual, { format = 'square', brand = '' } = {}) {
  const f = FORMATS[format];
  if (!f) throw new Error('Geçersiz format');
  const { w, h } = f;
  const c = palette(visual);
  const L = layout(format, w, h);
  const head = wrap(visual?.headline, L.hs, L.textW, L.maxH);
  const sub = wrap(visual?.subline, L.ss, L.textW, 3);
  const subY = L.top + head.length * L.hs * 1.12 + L.ss * 0.8;
  const ctaY = subY + sub.length * L.ss * 1.3 + 40;
  const cta = String(visual?.cta || '').slice(0, 30);
  const ctaW = Math.max(260, cta.length * L.ss * 0.62 + 96);
  const blob = format === 'wide'
    ? `<circle cx="${w * 0.86}" cy="${h * 0.5}" r="${h * 0.42}" fill="${c.accent}" opacity=".9"/><circle cx="${w * 0.9}" cy="${h * 0.2}" r="${h * 0.12}" fill="${c.fg}" opacity=".12"/>`
    : `<circle cx="${w}" cy="0" r="${format === 'story' ? w * 0.34 : w * 0.28}" fill="${c.accent}" opacity=".9"/><circle cx="${w * 0.1}" cy="${h * 0.95}" r="${w * 0.22}" fill="${c.fg}" opacity=".08"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(visual?.headline)}">
<rect width="${w}" height="${h}" fill="${c.bg}"/>${blob}
${brand ? textBlock([brand.toUpperCase()], { x: L.pad, y: L.pad + 30, size: 34, weight: 800, fill: c.fg }) : ''}
${textBlock(head, { x: L.pad, y: L.top, size: L.hs, weight: 900, fill: c.fg })}
${textBlock(sub, { x: L.pad, y: subY, size: L.ss, weight: 600, fill: c.fg, lh: 1.3 })}
${cta ? `<rect x="${L.pad}" y="${Math.round(ctaY)}" width="${Math.round(ctaW)}" height="${Math.round(L.ss * 2.1)}" rx="${Math.round(L.ss * 1.05)}" fill="${c.accent}"/>
${textBlock([cta], { x: L.pad + 48, y: ctaY + L.ss * 1.4, size: L.ss, weight: 800, fill: c.ctaText })}` : ''}
</svg>`;
}

module.exports = { renderCreative, palette, contrast, wrap, FORMATS };
