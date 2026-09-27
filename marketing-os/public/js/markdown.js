// Küçük, güvenli markdown çevirici: önce HTML kaçışı, sonra sınırlı biçimlendirme.
import { esc } from './office.js';

const inline = (s) => s
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|\W)\*([^*]+)\*/g, '$1<em>$2</em>');

function table(lines) {
  const rows = lines.filter((l) => !/^\|\s*:?-{2,}/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim())));
  const [head, ...body] = rows;
  return `<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${
    body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function renderMarkdown(src) {
  const lines = esc(src).split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\|/.test(l)) { const t = []; while (i < lines.length && /^\|/.test(lines[i])) t.push(lines[i++]); out.push(table(t)); continue; }
    if (/^\s*[-*] /.test(l)) { const t = []; while (i < lines.length && /^\s*[-*] /.test(lines[i])) t.push(lines[i++].replace(/^\s*[-*] /, '')); out.push(`<ul>${t.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`); continue; }
    if (/^\s*\d+\. /.test(l)) { const t = []; while (i < lines.length && /^\s*\d+\. /.test(lines[i])) t.push(lines[i++].replace(/^\s*\d+\. /, '')); out.push(`<ol>${t.map((x) => `<li>${inline(x)}</li>`).join('')}</ol>`); continue; }
    const h = l.match(/^(#{1,4}) (.*)/);
    if (h) out.push(`<h3>${inline(h[2])}</h3>`);
    else if (/^&gt; /.test(l)) out.push(`<blockquote>${inline(l.slice(5))}</blockquote>`);
    else if (/^---+$/.test(l)) out.push('<hr>');
    else if (l.trim()) out.push(`<p>${inline(l)}</p>`);
    i++;
  }
  return out.join('');
}
