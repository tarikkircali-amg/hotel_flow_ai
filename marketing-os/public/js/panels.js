// Sağ panel listeleri ve diyaloglar (brif, proje, kampanya detayı + onay).
import { api } from './api.js';
import { esc } from './office.js';

export const STATUS = {
  sirada: '⏳ Sırada', calisiyor: '⚙️ Ekip çalışıyor', onay_bekliyor: '🟠 Onayınızı bekliyor',
  onaylandi: '✅ Onaylandı', yayina_gonderildi: '🚀 Yayın aracına gönderildi', reddedildi: '❌ Reddedildi', hata: '⚠️ Hata — yeniden deneyin',
};
const CONF = { high: 'Güven: yüksek', medium: 'Güven: orta', low: 'Güven: düşük' };
export const HEX = /^#[0-9a-fA-F]{6}$/;
export const dlg = () => document.getElementById('dlg');

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
}

function campaignItem(c) {
  return `<li class="card"><div class="card-row">
      <div style="display:flex;gap:8px;align-items:center;min-width:0"><span class="dot" style="background:${HEX.test(c.project_color) ? c.project_color : '#999'}" aria-hidden="true"></span>
      <div style="min-width:0"><h3>${esc(c.title)}</h3><div class="muted">${esc(c.project_name)} · tur ${c.round} · 🌐 ${esc((c.languages || 'tr').toUpperCase().replaceAll(',', ' '))}${c.mode === 'demo' ? ' · demo' : ''}</div></div></div>
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

export function openBrief(projects, languages, onDone) {
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
      <fieldset class="langs"><legend>Yayın dilleri <span class="hint">(Türkçe onay dilidir, her zaman dahil)</span></legend>
        ${languages.map((l) => `<label class="chip"><input type="checkbox" name="languages" value="${l.code}" ${l.code === 'tr' ? 'checked disabled' : ''}>
          <span lang="${l.code}" dir="${l.dir}">${esc(l.native)}</span><small>${esc(l.name)}</small></label>`).join('')}
      </fieldset>
      <p class="muted">Her dil için 🌍 Lara ayrı bir uyarlama hazırlar. Ekip taslak üretir; hiçbir şey onayınız olmadan yayınlanmaz.</p>
      <p class="error" role="alert" id="b-err"></p>
    </div>
    <div class="dlg-foot"><button class="btn btn-primary" value="ok" id="b-submit">🚀 Ekibe gönder</button></div></form>`;
  d.showModal();
  d.querySelector('#b-submit').addEventListener('click', async (e) => {
    e.preventDefault();
    const fd = new FormData(d.querySelector('form'));
    const body = { ...Object.fromEntries(fd), languages: fd.getAll('languages') };
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
        <div class="field"><label for="p-url">Web adresi</label><input id="p-url" name="url" type="url" inputmode="url" placeholder="https://…" value="${v('url')}">
          ${p ? '<button class="btn btn-sm" type="button" id="p-import">🌐 Siteden bilgi al</button>' : '<span class="hint">Kaydettikten sonra siteden bilgi alabilirsiniz.</span>'}</div>
        <div class="field"><label for="p-tone">Marka tonu</label><input id="p-tone" name="tone" value="${v('tone')}" placeholder="Samimi, güven veren…"></div>
      </div>
      <p class="muted" id="p-site" role="status">${p?.site_fetched_at ? `✅ Site notları ${new Date(p.site_fetched_at).toLocaleDateString('tr-TR')} tarihinde alındı; ajans bunları kullanır.` : ''}</p>
      <p class="error" role="alert" id="p-err"></p>
    </div>
    <div class="dlg-foot"><button class="btn btn-primary" value="ok" id="p-save">Kaydet</button></div></form>`;
  d.showModal();
  d.querySelector('#p-import')?.addEventListener('click', async (e) => {
    const status = d.querySelector('#p-site');
    e.target.disabled = true; status.textContent = '🌐 Site okunuyor…'; d.querySelector('#p-err').textContent = '';
    try {
      const r = await api(`/projects/${p.id}/import-site`, { method: 'POST', body: { url: d.querySelector('#p-url').value } });
      const fill = (id, val) => { const el = d.querySelector(id); if (val && !el.value.trim()) el.value = val; };
      fill('#p-desc', r.suggestion?.description); fill('#p-aud', r.suggestion?.audience); fill('#p-tone', r.suggestion?.tone);
      status.textContent = '✅ Site notları kaydedildi. Boş alanlara öneriler yazıldı — kontrol edip Kaydet’e basın.';
    } catch (err) { d.querySelector('#p-err').textContent = err.message; status.textContent = ''; }
    e.target.disabled = false;
  });
  d.querySelector('#p-save').addEventListener('click', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(d.querySelector('form')));
    try {
      await api(p ? `/projects/${p.id}` : '/projects', { method: p ? 'PUT' : 'POST', body });
      d.close(); toast('Proje kaydedildi.'); onDone();
    } catch (err) { d.querySelector('#p-err').textContent = err.message; }
  });
}
