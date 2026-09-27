// Reklam kreatifi üretimi: Tasarımcının maket verisinden 3 formatta SVG.
// Harici servis yok; renkler WCAG AA kontrastına zorlanır.
const FORMATS = {
  square: { w: 1080, h: 1080, label: '1:1 (feed)' },
  story: { w: 1080, h: 1920, label: '9:16 (story/reels)' },
  wide: { w: 1920, h: 1080, label: '16:9 (YouTube/web)' },
};
const HEX = /^#[0-9a-fA-F]{6}$/;
const FONT = "Nunito, 'Segoe UI', 'Noto Sans', 'Noto Sans Arabic', Vazirmatn, 'Noto Sans SC', 'Noto Sans JP', 'Noto Sans KR', 'PingFang SC', 'Hiragino Sans', 'Microsoft YaHei', Tahoma, Arial, sans-serif";
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;

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

// Basit satır kırma: Latin/Arap/Kiril ≈ 0.55 × punto; Çince/Japonca/Korece ≈ 1 × punto
// ve boşluksuz metinde karakter bazında kırılır.
function wrap(text, fontSize, width, maxLines) {
  const src = String(text || '');
  const cjk = CJK.test(src);
  const perLine = Math.max(4, Math.floor(width / (fontSize * (cjk ? 1.05 : 0.55))));
  // CJK: Latin kelimeler bütün kalır, CJK karakterleri tek tek kırılabilir.
  const tokens = cjk ? src.replace(/\s+/g, ' ').match(/[A-Za-z0-9@#&.'’-]+|\s|./gu) : src.split(/\s+/).filter(Boolean);
  const join = cjk ? '' : ' ';
  const lines = [];
  let cur = '';
  for (const word of tokens) {
    if (cjk && !cur && word === ' ') continue;
    const next = cur ? `${cur}${join}${word}` : word;
    const len = cjk ? [...next].reduce((n, ch) => n + (CJK.test(ch) ? 1 : 0.55), 0) : next.length;
    const closing = cjk && /^[、。，．！？）」』】〉》!?,.)]$/.test(word); // satır başına noktalama gelmesin
    if (len > perLine && cur && !closing) { lines.push(cur.trimEnd()); cur = word === ' ' ? '' : word; } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = (cjk ? kept[maxLines - 1].slice(0, -1) : kept[maxLines - 1].replace(/\s*\S*$/, '')) + '…';
    return kept;
  }
  return lines;
}

// rtl: metin sağa hizalanır (x = sağ kenar), yön sağdan sola.
function textBlock(lines, { x, y, size, weight, fill, lh = 1.12, rtl = false }) {
  const dirAttr = rtl ? ' direction="rtl" unicode-bidi="embed" text-anchor="start"' : '';
  return lines.map((l, i) =>
    `<text x="${x}" y="${Math.round(y + i * size * lh)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${dirAttr}>${esc(l)}</text>`).join('');
}

function layout(fmt, w, h, withImage) {
  if (fmt === 'wide') return { pad: 120, textW: w * 0.5, hs: 100, ss: 42, top: h * 0.32, maxH: 3 };
  if (fmt === 'story') return { pad: 96, textW: w - 192, hs: 110, ss: 48, top: h * (withImage ? 0.56 : 0.42), maxH: withImage ? 4 : 5 };
  return { pad: 96, textW: w - 192, hs: withImage ? 78 : 96, ss: withImage ? 38 : 44, top: h * (withImage ? 0.56 : 0.36), maxH: withImage ? 2 : 4 };
}

// Görsel (AI üretimi) varsa metnin üstüne binmeyecek bir alana yerleşir; metin hep düz zemin üzerinde
// kalır, böylece kontrast garantisi bozulmaz.
function imageLayer(format, w, h, image, rtl) {
  if (!image) return '';
  const href = esc(image);
  if (format === 'wide') {
    const x = rtl ? 0 : w * 0.58;
    return `<clipPath id="ci"><rect x="${x}" y="0" width="${w * 0.42}" height="${h}"/></clipPath>
<image href="${href}" x="${x}" y="0" width="${w * 0.42}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#ci)"/>`;
  }
  const ih = h * (format === 'story' ? 0.48 : 0.46);
  return `<image href="${href}" x="0" y="0" width="${w}" height="${ih}" preserveAspectRatio="xMidYMid slice"/>`;
}

function decoration(format, w, h, c, { rtl, image }) {
  if (image) return '';
  const edge = rtl ? 0 : w;
  if (format === 'wide') {
    const cx = rtl ? w * 0.14 : w * 0.86;
    return `<circle cx="${cx}" cy="${h * 0.5}" r="${h * 0.42}" fill="${c.accent}" opacity=".9"/><circle cx="${rtl ? w * 0.1 : w * 0.9}" cy="${h * 0.2}" r="${h * 0.12}" fill="${c.fg}" opacity=".12"/>`;
  }
  return `<circle cx="${edge}" cy="0" r="${format === 'story' ? w * 0.34 : w * 0.28}" fill="${c.accent}" opacity=".9"/><circle cx="${rtl ? w * 0.9 : w * 0.1}" cy="${h * 0.95}" r="${w * 0.22}" fill="${c.fg}" opacity=".08"/>`;
}

// visual: {headline, subline, cta, bg, fg, accent}; opts: format, brand, dir ('rtl'), lang, image (data URI)
function renderCreative(visual, { format = 'square', brand = '', dir = 'ltr', lang = '', image = '' } = {}) {
  const f = FORMATS[format];
  if (!f) throw new Error('Geçersiz format');
  const { w, h } = f;
  const rtl = dir === 'rtl';
  const c = palette(visual);
  const L = layout(format, w, h, Boolean(image));
  const x = rtl ? w - L.pad : L.pad;
  const head = wrap(visual?.headline, L.hs, L.textW, L.maxH);
  const sub = wrap(visual?.subline, L.ss, L.textW, image && format === 'square' ? 2 : 3);
  const subY = L.top + head.length * L.hs * 1.12 + L.ss * 0.8;
  const ctaY = subY + sub.length * L.ss * 1.3 + 40;
  const cta = [...String(visual?.cta || '')].slice(0, 30).join('');
  const ctaW = Math.max(260, [...cta].length * L.ss * (CJK.test(cta) ? 1.05 : 0.62) + 96);
  const ctaX = rtl ? x - ctaW : x;
  const brandY = image ? h - L.pad + 10 : L.pad + 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(visual?.headline)}"${lang ? ` xml:lang="${esc(lang)}"` : ''}>
<rect width="${w}" height="${h}" fill="${c.bg}"/>${decoration(format, w, h, c, { rtl, image })}${imageLayer(format, w, h, image, rtl)}
${brand ? textBlock([brand.toUpperCase()], { x, y: brandY, size: 34, weight: 800, fill: c.fg, rtl }) : ''}
${textBlock(head, { x, y: L.top, size: L.hs, weight: 900, fill: c.fg, rtl })}
${textBlock(sub, { x, y: subY, size: L.ss, weight: 600, fill: c.fg, lh: 1.3, rtl })}
${cta ? `<rect x="${Math.round(ctaX)}" y="${Math.round(ctaY)}" width="${Math.round(ctaW)}" height="${Math.round(L.ss * 2.1)}" rx="${Math.round(L.ss * 1.05)}" fill="${c.accent}"/>
${textBlock([cta], { x: rtl ? ctaX + ctaW - 48 : ctaX + 48, y: ctaY + L.ss * 1.4, size: L.ss, weight: 800, fill: c.ctaText, rtl })}` : ''}
</svg>`;
}

module.exports = { renderCreative, palette, contrast, wrap, FORMATS };
