// Kampanya penceresi: teslimatlar (dillere göre), kreatifler, onay, yayın, performans.
import { api } from './api.js';
import { esc } from './office.js';
import { renderMarkdown } from './markdown.js';
import { STATUS, HEX, dlg, toast } from './panels.js';
import { creativesHTML, bindCreatives } from './creatives.js';
import { performanceHTML, bindPerformance } from './performance.js';

const CONF = { high: 'Güven: yüksek', medium: 'Güven: orta', low: 'Güven: düşük' };

function mockup(v) {
  if (!v) return '';
  const col = (c, f) => (HEX.test(c) ? c : f);
  return `<div class="mockup" style="background:${col(v.bg, '#0f172a')};color:${col(v.fg, '#fff')}" aria-label="Reklam maketi önizlemesi">
    <p class="h">${esc(v.headline)}</p><p class="s">${esc(v.subline)}</p>
    <span class="c" style="background:${col(v.accent, '#f59e0b')};color:${col(v.bg, '#0f172a')}">${esc(v.cta)}</span></div>
    ${v.image_prompt ? `<p class="muted"><strong>Görsel üretim komutu:</strong> ${esc(v.image_prompt)}</p>` : ''}`;
}

function deliverableCard(x, a, open, lang) {
  const loc = x.data?.lang ? lang(x.data.lang) : null;
  const who = loc ? `${esc(a.name)} · ${esc(a.role)} — ${esc(loc.native)}` : `${esc(a.name)} · ${esc(a.role)}`;
  const body = `<div class="md" ${loc ? `lang="${loc.code}"` : ''}>${renderMarkdown(x.body)}</div>`;
  const back = x.data?.back_translation ? `<p class="back"><strong>🇹🇷 Türkçe geri çeviri:</strong> ${esc(x.data.back_translation)}</p>` : '';
  const vis = x.agent_id === 'tasarimci' ? mockup(x.data?.visual) : '';
  return `<details class="deliv" ${open ? 'open' : ''}>
    <summary><span aria-hidden="true">${a.emoji}</span><span><span class="who">${who}</span><br><span class="muted">${esc(x.title)}</span></span>
    <span class="conf" data-c="${x.confidence}">${CONF[x.confidence] || ''}</span></summary>
    <div class="deliv-body">${vis}${back}${body}</div></details>`;
}

function decisionBox() {
  return `<div class="approve-box">
    <strong>Karar sizin 👑</strong>
    <div class="field"><label for="d-note">Not (revizyon için zorunlu)</label><textarea id="d-note" placeholder="Örn. Almanca metinlerde “Sie” hitabı kullanın"></textarea></div>
    <p class="error" role="alert" id="d-err"></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ok" data-d="approve" type="button">✅ Onayla</button>
      <button class="btn" data-d="revise" type="button">🔁 Revize iste</button>
      <button class="btn btn-danger" data-d="reject" type="button">❌ Reddet</button></div></div>`;
}

export async function openCampaign(id, ctx, onDone) {
  const { roster, me } = ctx;
  const c = await api(`/campaigns/${id}`);
  const lang = (code) => me.languages.find((l) => l.code === code);
  const langs = (c.languages || 'tr').split(',').map(lang).filter(Boolean);
  const who = (aid) => roster.find((a) => a.id === aid.split(':')[0]);
  const hasDesign = c.deliverables.some((d) => d.agent_id === 'tasarimci' && d.data?.visual);
  const released = ['onaylandi', 'yayina_gonderildi'].includes(c.status);
  const d = dlg();
  const cards = c.deliverables.map((x, i) => deliverableCard(x, who(x.agent_id), i === c.deliverables.length - 1, lang)).join('');
  d.innerHTML = `<div class="dlg-head"><h2 id="dlg-title">${esc(c.title)}</h2><button class="btn btn-sm" type="button" data-close>Kapat</button></div>
    <div class="dlg-body">
      <div class="muted">${esc(c.project_name)} · tur ${c.round} · 🌐 ${langs.map((l) => esc(l.native)).join(' · ')} ·
        <span class="status" data-s="${c.status}">${STATUS[c.status]}</span>${c.mode === 'demo' ? ' · <strong>demo çıktısı</strong>' : ''}</div>
      ${c.revision_note ? `<div class="card"><strong>Son revizyon notunuz:</strong> ${esc(c.revision_note)}</div>` : ''}
      ${hasDesign ? creativesHTML(c.id, langs, me) : ''}
      ${cards || '<p class="empty">Ekip henüz teslimat yapmadı. Ofisi izleyin 👀</p>'}
      ${c.status === 'onay_bekliyor' ? decisionBox() : ''}
      ${released ? performanceHTML() : ''}
    </div>
    <div class="dlg-foot">
      ${c.deliverables.length ? `<a class="btn" href="/api/campaigns/${c.id}/export" download>⬇️ Paketi indir (.md)</a>` : ''}
      ${c.status === 'hata' ? '<button class="btn btn-primary" type="button" data-retry>🔄 Yeniden dene</button>' : ''}
      ${c.status === 'onaylandi' ? (me.publishEnabled
        ? '<button class="btn btn-primary" type="button" data-publish>🚀 Yayın aracına gönder (taslak)</button>'
        : '<span class="muted">🚀 Yayına göndermek için sunucuda <code>MOS_PUBLISH_WEBHOOK_URL</code> tanımlayın (Zapier/Make/n8n).</span>') : ''}
    </div>`;
  d.showModal();
  d.querySelector('[data-close]').onclick = () => d.close();
  bindCreatives(d, c.id, api);
  if (released) bindPerformance(d, c.id, me);
  d.querySelector('[data-retry]')?.addEventListener('click', async () => { await api(`/campaigns/${id}/retry`, { method: 'POST' }); d.close(); onDone(); });
  d.querySelector('[data-publish]')?.addEventListener('click', async (e) => {
    if (!confirm(`Onaylı paket ve ${langs.length} dildeki kreatifler, yayın aracınıza TASLAK olarak gönderilecek. Devam edilsin mi?`)) return;
    e.target.disabled = true;
    try { await api(`/campaigns/${id}/publish`, { method: 'POST', body: { confirm: true } }); d.close(); toast('Taslaklar yayın aracına gönderildi 🚀'); onDone(); }
    catch (err) { e.target.disabled = false; toast(err.message); }
  });
  d.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', async () => {
    const decision = b.dataset.d;
    if (decision === 'reject' && !confirm('Bu kampanyayı reddetmek istediğinize emin misiniz?')) return;
    try {
      await api(`/campaigns/${id}/decision`, { method: 'POST', body: { decision, note: d.querySelector('#d-note').value } });
      d.close();
      toast({ approve: 'Onaylandı! Kreatifler ve paket hazır. ✅', revise: 'Revizyon ekibe iletildi 🔁', reject: 'Reddedildi.' }[decision]);
      onDone();
    } catch (err) { d.querySelector('#d-err').textContent = err.message; }
  }));
}
