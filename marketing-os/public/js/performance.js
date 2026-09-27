// Performans panosu: KPI kutucukları, günlük tıklama grafiği (tek seri), tablo görünümü,
// elle / CSV veri girişi ve Deniz'e rapor yazdırma.
import { api } from './api.js';
import { esc } from './office.js';
import { toast } from './panels.js';

const HEAD = {
  day: ['day', 'date', 'tarih', 'gün', 'gun'], channel: ['channel', 'kanal', 'platform'], lang: ['lang', 'language', 'dil'],
  impressions: ['impressions', 'gösterim', 'gosterim', 'impr'], clicks: ['clicks', 'tıklama', 'tiklama'],
  conversions: ['conversions', 'dönüşüm', 'donusum', 'conv'], spend: ['spend', 'cost', 'harcama', 'maliyet'],
};

export function parseCsv(text) {
  const lines = String(text).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV en az bir başlık ve bir veri satırı içermeli.');
  const sep = lines[0].includes(';') ? ';' : ',';
  const cols = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idx = Object.fromEntries(Object.entries(HEAD).map(([k, names]) => [k, cols.findIndex((c) => names.includes(c))]));
  if (idx.day < 0 || idx.channel < 0) throw new Error('CSV başlığında en az “tarih” ve “kanal” sütunları olmalı.');
  return lines.slice(1).map((l) => {
    const v = l.split(sep).map((x) => x.trim());
    const n = (k) => (idx[k] >= 0 ? Number(String(v[idx[k]] || '0').replace(',', '.')) : 0);
    return { day: v[idx.day], channel: v[idx.channel], lang: idx.lang >= 0 ? v[idx.lang] : '',
      impressions: n('impressions'), clicks: n('clicks'), conversions: n('conversions'), spend: n('spend') };
  });
}

export function performanceHTML() {
  return `<section class="perf" aria-labelledby="perf-title">
    <div class="card-row"><h3 id="perf-title">📈 Performans</h3>
      <button class="btn btn-sm btn-primary" type="button" data-report>📊 Deniz'e rapor yazdır</button></div>
    <div data-perf><p class="muted">Yükleniyor…</p></div>
    <details class="card"><summary><strong>➕ Veri ekle</strong> <span class="muted">(elle veya CSV; Zapier/Make ile otomatik için ⚙️ Ayarlar)</span></summary>
      <form data-row class="grid-perf" novalidate>
        <div class="field"><label for="m-day">Tarih</label><input id="m-day" name="day" type="date" required></div>
        <div class="field"><label for="m-ch">Kanal</label><input id="m-ch" name="channel" placeholder="Instagram" required></div>
        <div class="field"><label for="m-lang">Dil</label><input id="m-lang" name="lang" placeholder="de" maxlength="8"></div>
        <div class="field"><label for="m-imp">Gösterim</label><input id="m-imp" name="impressions" type="number" min="0" inputmode="numeric"></div>
        <div class="field"><label for="m-clk">Tıklama</label><input id="m-clk" name="clicks" type="number" min="0" inputmode="numeric"></div>
        <div class="field"><label for="m-conv">Dönüşüm</label><input id="m-conv" name="conversions" type="number" min="0" inputmode="numeric"></div>
        <div class="field"><label for="m-sp">Harcama</label><input id="m-sp" name="spend" type="number" min="0" step="0.01" inputmode="decimal"></div>
        <button class="btn" type="submit">Satırı kaydet</button>
      </form>
      <div class="field"><label for="m-csv">CSV yapıştır veya dosya seç</label>
        <textarea id="m-csv" placeholder="tarih;kanal;dil;gösterim;tıklama;dönüşüm;harcama&#10;2026-09-20;Instagram;de;10000;200;10;500"></textarea>
        <input type="file" accept=".csv,text/csv" data-csv-file aria-label="CSV dosyası seç"></div>
      <button class="btn btn-sm" type="button" data-csv>CSV'yi içe aktar</button>
      <p class="error" role="alert" data-perf-err></p>
    </details></section>`;
}

function fmt(me) {
  const nf = new Intl.NumberFormat('tr-TR');
  const pf = new Intl.NumberFormat('tr-TR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let cur;
  try { cur = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: me.currency }); } catch { cur = { format: (v) => `${v.toFixed(2)} ${me.currency}` }; }
  return { n: (v) => nf.format(v), money: (v) => (v == null ? '—' : cur.format(v)), pct: (v) => (v == null ? '—' : pf.format(v)) };
}

function chart(byDay, f) {
  if (!byDay.length) return '';
  const W = 640, H = 200, L = 44, B = 26, T = 10;
  const max = Math.max(1, ...byDay.map((d) => d.clicks));
  const step = (W - L - 8) / byDay.length;
  const bw = Math.max(4, Math.min(28, step - 4));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const grid = [0, 0.5, 1].map((k) => `<line x1="${L}" x2="${W - 4}" y1="${y(max * k)}" y2="${y(max * k)}" class="grid"/>
    <text x="${L - 6}" y="${y(max * k) + 4}" text-anchor="end" class="axis">${f.n(Math.round(max * k))}</text>`).join('');
  const bars = byDay.map((d, i) => {
    const x = L + i * step + (step - bw) / 2, top = y(d.clicks), h = H - B - top, r = Math.min(4, bw / 2, h);
    const path = h > 0 ? `M${x},${H - B} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${H - B} Z` : '';
    const label = byDay.length <= 10 || i % Math.ceil(byDay.length / 8) === 0
      ? `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="axis">${esc(d.key.slice(5))}</text>` : '';
    return `<g class="bar-g"><title>${esc(d.key)} · ${f.n(d.clicks)} tıklama · ${f.n(d.impressions)} gösterim</title>
      <rect x="${L + i * step}" y="${T}" width="${step}" height="${H - T - B}" fill="transparent"/>${path ? `<path d="${path}" class="bar"/>` : ''}${label}</g>`;
  }).join('');
  return `<figure class="chart"><figcaption><strong>Günlük tıklama</strong></figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Günlük tıklama grafiği, ${byDay.length} gün">${grid}${bars}</svg></figure>`;
}

function render(box, m, me) {
  const f = fmt(me);
  if (!m.rows.length) { box.innerHTML = '<p class="empty">Henüz ölçüm verisi yok. Aşağıdan ekleyin; Deniz rakam uydurmaz.</p>'; return; }
  const t = m.totals;
  const tiles = [['Gösterim', f.n(t.impressions)], ['Tıklama', f.n(t.clicks)], ['Dönüşüm', f.n(t.conversions)], ['Harcama', f.money(t.spend)],
    ['CTR', f.pct(t.ctr)], ['CPC', f.money(t.cpc)], ['CPA', f.money(t.cpa)]];
  const table = (rows, title) => `<table><caption>${title}</caption><thead><tr><th scope="col">${title.split(' ')[0]}</th><th scope="col">Gösterim</th><th scope="col">Tıklama</th>
    <th scope="col">Dönüşüm</th><th scope="col">Harcama</th><th scope="col">CTR</th><th scope="col">CPA</th></tr></thead><tbody>
    ${rows.map((g) => `<tr><th scope="row">${esc(g.key)}</th><td>${f.n(g.impressions)}</td><td>${f.n(g.clicks)}</td><td>${f.n(g.conversions)}</td>
    <td>${f.money(g.spend)}</td><td>${f.pct(g.ctr)}</td><td>${f.money(g.cpa)}</td></tr>`).join('')}</tbody></table>`;
  box.innerHTML = `<div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>
    ${chart(m.byDay, f)}
    <div class="md">${table(m.byChannel, 'Kanal bazında')}${m.byLang.length > 1 ? table(m.byLang, 'Dil bazında') : ''}</div>
    <details><summary>Günlük tablo görünümü</summary><div class="md">${table(m.byDay, 'Gün bazında')}</div></details>`;
}

export function bindPerformance(root, id, me) {
  const box = root.querySelector('[data-perf]');
  const err = root.querySelector('[data-perf-err]');
  const load = async () => render(box, await api(`/campaigns/${id}/metrics`), me);
  const send = async (rows) => {
    err.textContent = '';
    try { const r = await api(`/campaigns/${id}/metrics`, { method: 'POST', body: { rows } }); toast(`${r.count} satır kaydedildi.`); await load(); return true; }
    catch (e) { err.textContent = e.message; return false; }
  };
  load().catch((e) => { box.innerHTML = `<p class="error">${esc(e.message)}</p>`; });
  root.querySelector('[data-row]').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await send([Object.fromEntries(new FormData(e.target))])) e.target.reset();
  });
  root.querySelector('[data-csv-file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) root.querySelector('#m-csv').value = await file.text();
  });
  root.querySelector('[data-csv]').addEventListener('click', async () => {
    try { await send(parseCsv(root.querySelector('#m-csv').value)); } catch (e) { err.textContent = e.message; }
  });
  root.querySelector('[data-report]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try { await api(`/campaigns/${id}/report`, { method: 'POST' }); toast('Deniz raporu yazıyor 📊 — ofisi izleyin, bitince kampanyada görünür.'); }
    catch (x) { toast(x.message); }
    e.target.disabled = false;
  });
}
