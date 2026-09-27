// Sağ panel listeleri ve diyaloglar (brif, proje, kampanya detayı + onay).
import { api } from './api.js';
import { esc } from './office.js';
import { renderMarkdown } from './markdown.js';
import { creativesHTML, downloadPng } from './creatives.js';

const STATUS = {
  sirada: '⏳ Sırada', calisiyor: '⚙️ Ekip çalışıyor', onay_bekliyor: '🟠 Onayınızı bekliyor',
  onaylandi: '✅ Onaylandı', yayina_gonderildi: '🚀 Yayın aracına gönderildi', reddedildi: '❌ Reddedildi', hata: '⚠️ Hata — yeniden deneyin',
};
const CONF = { high: 'Güven: yüksek', medium: 'Güven: orta', low: 'Güven: düşük' };
const HEX = /^#[0-9a-fA-F]{6}$/;
const dlg = () => document.getElementById('dlg');

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
}

function campaignItem(c) {
  return `<li class="card"><div class="card-row">
      <div style="display:flex;gap:8px;align-items:center;min-width:0"><span class="dot" style="background:${HEX.test(c.project_color) ? c.project_color : '#999'}" aria-hidden="true"></span>
      <div style="min-width:0"><h3>${esc(c.title)}</h3><div class="muted">${esc(c.project_name)} · tur ${c.round}${c.mode === 'demo' ? ' · demo' : ''}</div></div></div>
      <button class="btn btn-sm" data-open="${c.id}" type="button">Aç</button></div>
      <div class="status" data-s="${c.status}">${STATUS[c.status] || esc(c.status)}</div></li>`;
}

export function renderCampaigns(list) {
  const waiting = list.filter((c) => c.status === 'onay_bekliyor');
  const count = document.getElementById('inbox-count');
  count.hidden = !waiting.length; count.textContent = waiting.length;
  document.getElementById('p-inbox').innerHTML = waiting.length
    ? `<ul class="list">${waiting.map(campaignItem).join('')}</ul>`
    : '<p class="empty">📭 Onay bekleyen iş yok.<br>Ekip bir kampanyayı bitirdiğinde burada görünecek.</p>';
  document.getElementById('p-camps').innerHTML = list.length
    ? `<ul class="list">${list.map(campaignItem).join('')}</ul>`
    : '<p class="empty">Henüz kampanya yok. “Yeni brif” ile başlayın.</p>';
}

export function renderProjects(list) {
  document.getElementById('p-projects').innerHTML = `
    <button class="btn btn-sm" type="button" data-project="new" style="margin-bottom:8px">➕ Proje ekle</button>
    <ul class="list">${list.map((p) => `<li class="card"><div class="card-row">
      <div style="display:flex;gap:8px;align-items:center"><span class="dot" style="background:${esc(p.color)}" aria-hidden="true"></span><h3>${esc(p.name)}</h3></div>
      <button class="btn btn-sm" type="button" data-project="${p.id}">Düzenle</button></div>
      <p class="muted" style="margin:4px 0 0">${p.description ? esc(p.description) : '⚠️ Açıklama eksik — ajans bu bilgiyi “bilgi gerekli” diye işaretler.'}</p></li>`).join('')}</ul>`;
}

export function openBrief(projects, onDone) {
  const d = dlg();
  d.innerHTML = `<form method="dialog" id="brief-form" novalidate>
    <div class="dlg-head"><h2 id="dlg-title">📝 Yeni brif</h2><button class="btn btn-sm" value="cancel" formnovalidate>Kapat</button></div>
    <div class="dlg-body">
      <div class="field"><label for="b-project">Proje</label><select id="b-project" name="project_id" required>
        ${projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="b-title">Kampanya adı</label><input id="b-title" name="title" required maxlength="120" placeholder="Örn. Sonbahar lansmanı"></div>
      <div class="field"><label for="b-goal">Amaç</label><textarea id="b-goal" name="goal" placeholder="Ne istiyoruz? Örn. 30 günde demo talebi toplamak"></textarea></div>
      <div class="grid-2">
        <div class="field"><label for="b-channels">Kanallar</label><input id="b-channels" name="channels" placeholder="Instagram, LinkedIn, Google Ads"></div>
        <div class="field"><label for="b-budget">Bütçe notu</label><input id="b-budget" name="budget_note" placeholder="İsteğe bağlı"></div>
      </div>
      <p class="muted">Ekip taslak hazırlar; hiçbir şey onayınız olmadan yayınlanmaz.</p>
      <p class="error" role="alert" id="b-err"></p>
    </div>
    <div class="dlg-foot"><button class="btn btn-primary" value="ok" id="b-submit">🚀 Ekibe gönder</button></div></form>`;
  d.showModal();
  d.querySelector('#b-submit').addEventListener('click', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(d.querySelector('form')));
    try { await api('/campaigns', { method: 'POST', body }); d.close(); toast('Brif ekibe iletildi — ofisi izleyin! 👀'); onDone(); }
    catch (err) { d.querySelector('#b-err').textContent = err.message; }
  });
}

export function openProject(p, onDone) {
  const d = dlg();
  const v = (k) => esc(p?.[k] || '');
  d.innerHTML = `<form method="dialog" novalidate>
    <div class="dlg-head"><h2 id="dlg-title">${p ? 'Projeyi düzenle' : 'Yeni proje'}</h2><button class="btn btn-sm" value="cancel" formnovalidate>Kapat</button></div>
    <div class="dlg-body">
      <div class="grid-2">
        <div class="field"><label for="p-name">Ad</label><input id="p-name" name="name" required value="${v('name')}"></div>
        <div class="field"><label for="p-color">Renk</label><input id="p-color" name="color" type="color" value="${v('color') || '#6366f1'}"></div>
      </div>
      <div class="field"><label for="p-desc">Ne yapıyor?</label><textarea id="p-desc" name="description">${v('description')}</textarea>
        <span class="hint">Ajans yalnızca buradaki bilgiyi kullanır; eksik bilgiyi uydurmaz.</span></div>
      <div class="field"><label for="p-aud">Hedef kitle</label><input id="p-aud" name="audience" value="${v('audience')}"></div>
      <div class="grid-2">
        <div class="field"><label for="p-url">Web adresi</label><input id="p-url" name="url" value="${v('url')}"></div>
        <div class="field"><label for="p-tone">Marka tonu</label><input id="p-tone" name="tone" value="${v('tone')}" placeholder="Samimi, güven veren…"></div>
      </div>
      <p class="error" role="alert" id="p-err"></p>
    </div>
    <div class="dlg-foot"><button class="btn btn-primary" value="ok" id="p-save">Kaydet</button></div></form>`;
  d.showModal();
  d.querySelector('#p-save').addEventListener('click', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(d.querySelector('form')));
    try {
      await api(p ? `/projects/${p.id}` : '/projects', { method: p ? 'PUT' : 'POST', body });
      d.close(); toast('Proje kaydedildi.'); onDone();
    } catch (err) { d.querySelector('#p-err').textContent = err.message; }
  });
}

function mockup(v) {
  if (!v) return '';
  const col = (c, f) => (HEX.test(c) ? c : f);
  return `<div class="mockup" style="background:${col(v.bg, '#0f172a')};color:${col(v.fg, '#fff')}" aria-label="Reklam maketi önizlemesi">
    <p class="h">${esc(v.headline)}</p><p class="s">${esc(v.subline)}</p>
    <span class="c" style="background:${col(v.accent, '#f59e0b')};color:${col(v.bg, '#0f172a')}">${esc(v.cta)}</span></div>
    <p class="muted"><strong>Görsel üretim komutu:</strong> ${esc(v.image_prompt)}</p>`;
}

export async function openCampaign(id, roster, onDone, { publishEnabled = false } = {}) {
  const c = await api(`/campaigns/${id}`);
  const who = (aid) => roster.find((a) => a.id === aid.split(':')[0]);
  const d = dlg();
  const cards = c.deliverables.map((x, i) => {
    const a = who(x.agent_id);
    return `<details class="deliv" ${i === c.deliverables.length - 1 ? 'open' : ''}>
      <summary><span aria-hidden="true">${a.emoji}</span><span><span class="who">${esc(a.name)}</span> · ${esc(a.role)}<br><span class="muted">${esc(x.title)}</span></span>
      <span class="conf" data-c="${x.confidence}">${CONF[x.confidence] || ''}</span></summary>
      <div class="md">${x.data?.visual ? mockup(x.data.visual) + creativesHTML(c.id) : ''}${renderMarkdown(x.body)}</div></details>`;
  }).join('');
  const decide = c.status === 'onay_bekliyor' ? `<div class="approve-box">
      <strong>Karar sizin 👑</strong>
      <div class="field"><label for="d-note">Not (revizyon için zorunlu)</label><textarea id="d-note" placeholder="Örn. Tonu daha samimi yapın, fiyat vurgusu olmasın"></textarea></div>
      <p class="error" role="alert" id="d-err"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ok" data-d="approve" type="button">✅ Onayla</button>
        <button class="btn" data-d="revise" type="button">🔁 Revize iste</button>
        <button class="btn btn-danger" data-d="reject" type="button">❌ Reddet</button></div></div>` : '';
  d.innerHTML = `<div class="dlg-head"><h2 id="dlg-title">${esc(c.title)}</h2><button class="btn btn-sm" type="button" data-close>Kapat</button></div>
    <div class="dlg-body">
      <div class="muted">${esc(c.project_name)} · tur ${c.round} · <span class="status" data-s="${c.status}">${STATUS[c.status]}</span>${c.mode === 'demo' ? ' · <strong>demo çıktısı</strong>' : ''}</div>
      ${c.revision_note ? `<div class="card"><strong>Son revizyon notunuz:</strong> ${esc(c.revision_note)}</div>` : ''}
      ${cards || '<p class="empty">Ekip henüz teslimat yapmadı. Ofisi izleyin 👀</p>'}
      ${decide}
    </div>
    <div class="dlg-foot">
      ${c.deliverables.length ? `<a class="btn" href="/api/campaigns/${c.id}/export" download>⬇️ Paketi indir (.md)</a>` : ''}
      ${c.status === 'hata' ? '<button class="btn btn-primary" type="button" data-retry>🔄 Yeniden dene</button>' : ''}
      ${c.status === 'onaylandi' ? (publishEnabled
        ? '<button class="btn btn-primary" type="button" data-publish>🚀 Yayın aracına gönder (taslak)</button>'
        : '<span class="muted">🚀 Yayına göndermek için sunucuda <code>MOS_PUBLISH_WEBHOOK_URL</code> tanımlayın (Zapier/Make/n8n).</span>') : ''}
    </div>`;
  d.showModal();
  d.querySelector('[data-close]').onclick = () => d.close();
  d.querySelectorAll('[data-png]').forEach((b) => b.addEventListener('click', () => downloadPng(c.id, b.dataset.png)));
  d.querySelector('[data-publish]')?.addEventListener('click', async (e) => {
    if (!confirm('Onaylı paket ve kreatifler, yayın aracınıza TASLAK olarak gönderilecek. Devam edilsin mi?')) return;
    e.target.disabled = true;
    try { await api(`/campaigns/${id}/publish`, { method: 'POST', body: { confirm: true } }); d.close(); toast('Taslaklar yayın aracına gönderildi 🚀'); onDone(); }
    catch (err) { e.target.disabled = false; toast(err.message); }
  });
  d.querySelector('[data-retry]')?.addEventListener('click', async () => { await api(`/campaigns/${id}/retry`, { method: 'POST' }); d.close(); onDone(); });
  d.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', async () => {
    const decision = b.dataset.d;
    if (decision === 'reject' && !confirm('Bu kampanyayı reddetmek istediğinize emin misiniz?')) return;
    try {
      await api(`/campaigns/${id}/decision`, { method: 'POST', body: { decision, note: d.querySelector('#d-note').value } });
      d.close();
      toast({ approve: 'Onaylandı! Paket indirilebilir. ✅', revise: 'Revizyon ekibe iletildi 🔁', reject: 'Reddedildi.' }[decision]);
      onDone();
    } catch (err) { d.querySelector('#d-err').textContent = err.message; }
  }));
}
