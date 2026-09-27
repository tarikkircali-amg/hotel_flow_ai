// Web sitesinden marka bilgisi çekme (ör. Hostinger'daki siteniz).
// SSRF koruması: yalnızca http(s), özel/yerel IP'ler yasak, her yönlendirmede yeniden denetim,
// boyut ve süre sınırı. Çekilen metin ajanlara VERİ olarak verilir, talimat olarak değil.
const dns = require('dns').promises;
const net = require('net');

const MAX_BYTES = 1.5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

const fail = (msg, status = 400) => Object.assign(new Error(msg), { status });

async function assertPublic(url, lookup) {
  let u;
  try { u = new URL(url); } catch { throw fail('Geçerli bir web adresi girin (https://… ile).'); }
  if (!/^https?:$/.test(u.protocol)) throw fail('Yalnızca http/https adresleri desteklenir.');
  if (u.username || u.password) throw fail('Adres kullanıcı adı/parola içeremez.');
  const addrs = net.isIP(u.hostname) ? [{ address: u.hostname }] : await lookup(u.hostname, { all: true }).catch(() => []);
  if (!addrs.length) throw fail('Alan adı çözümlenemedi. Adresi kontrol edin.');
  if (addrs.some((a) => isPrivateIp(a.address))) throw fail('Yerel/özel ağ adreslerine erişime izin verilmez.');
  return u;
}

async function fetchHtml(url, { fetchImpl = fetch, lookup = dns.lookup, timeoutMs = 10000 } = {}) {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const u = await assertPublic(current, lookup);
    let res;
    try {
      res = await fetchImpl(u.href, { redirect: 'manual', headers: { 'User-Agent': 'MIZ-Marketing-OS/1.0 (+site-import)', Accept: 'text/html' }, signal: AbortSignal.timeout(timeoutMs) });
    } catch { throw fail('Siteye ulaşılamadı veya zaman aşımı oldu.', 502); }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { current = new URL(res.headers.get('location'), u).href; continue; }
    if (!res.ok) throw fail(`Site hata döndürdü (HTTP ${res.status}).`, 502);
    if (!/text\/html|application\/xhtml/.test(res.headers.get('content-type') || '')) throw fail('Adres bir web sayfası (HTML) döndürmedi.');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw fail('Sayfa çok büyük (1,5 MB sınırı).');
    return { html: buf.toString('utf8'), finalUrl: u.href };
  }
  throw fail('Çok fazla yönlendirme var.');
}

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const clean = (s) => decode(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function meta(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  return tag ? clean(tag.match(/content=["']([^"']*)["']/i)?.[1]) : '';
}

// Sayfadan pazarlama için anlamlı metni çıkarır.
function extract(html) {
  const body = html.replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const pick = (tag, max) => [...body.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'))]
    .map((m) => clean(m[1])).filter((t) => t.length > 2).slice(0, max);
  return {
    lang: html.match(/<html[^>]*\blang=["']?([^"'\s>]+)/i)?.[1] || '',
    title: clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]),
    description: meta(html, 'description') || meta(html, 'og:description'),
    siteName: meta(html, 'og:site_name'),
    headings: [...pick('h1', 5), ...pick('h2', 12), ...pick('h3', 12)],
    paragraphs: [...pick('p', 25), ...pick('li', 25)].filter((t) => t.length > 30),
  };
}

function toNotes(x, url) {
  const lines = [
    `Kaynak: ${url}`, x.siteName && `Site adı: ${x.siteName}`, x.title && `Başlık: ${x.title}`,
    x.description && `Açıklama: ${x.description}`, x.lang && `Sayfa dili: ${x.lang}`,
    x.headings.length && `Başlıklar:\n- ${x.headings.join('\n- ')}`,
    x.paragraphs.length && `Metinler:\n- ${x.paragraphs.join('\n- ')}`,
  ].filter(Boolean);
  return lines.join('\n').slice(0, 6000);
}

async function importSite(url, opts) {
  const { html, finalUrl } = await fetchHtml(url, opts);
  const x = extract(html);
  if (!x.title && !x.description && !x.headings.length) throw fail('Sayfada okunabilir içerik bulunamadı (site yalnızca JavaScript ile yükleniyor olabilir).', 422);
  return { notes: toNotes(x, finalUrl), extracted: x };
}

module.exports = { importSite, extract, isPrivateIp, assertPublic };
