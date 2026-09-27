// Ayarlar: sistem durumu ve Zapier/Make ile otomatik ölçüm alımı anahtarı.
import { api } from './api.js';
import { esc } from './office.js';
import { dlg, askConfirm } from './panels.js';

const row = (ok, label, hint) => `<li>${ok ? '✅' : '⚪'} <strong>${label}</strong> — <span class="muted">${hint}</span></li>`;

export async function openSettings(me) {
  const [s, brand] = await Promise.all([api('/settings/integrations'), api('/settings/brand')]);
  const d = dlg();
  const url = `${location.origin}${s.ingestPath}`;
  d.innerHTML = `<div class="dlg-head"><h2 id="dlg-title">⚙️ Ayarlar ve entegrasyonlar</h2><button class="btn btn-sm" type="button" data-close>Kapat</button></div>
    <div class="dlg-body">
      <ul class="list">
        ${row(me.mode === 'ai', 'AI ekibi', me.mode === 'ai' ? `Model: ${esc(me.model)}` : 'Demo modu — ANTHROPIC_API_KEY tanımlayın')}
        ${row(me.imageEnabled, 'AI görsel', me.imageEnabled ? 'Açık' : 'MOS_IMAGE_PROVIDER + anahtar gerekli')}
        ${row(me.publishEnabled, 'Yayın köprüsü', me.publishEnabled ? 'Açık' : 'MOS_PUBLISH_WEBHOOK_URL gerekli')}
        ${row(s.hasIngestToken, 'Otomatik ölçüm alımı', s.hasIngestToken ? 'Anahtar tanımlı' : 'Anahtar oluşturun')}
      </ul>
      <section class="card"><h3>🏷️ Marka kimliği</h3>
        <p class="muted">Ekip her kampanyada bu notları “marka kimliği” olarak kullanır (rakamları aynen, kaynağıyla).
          ${brand.fetchedAt ? `Son güncelleme: ${new Date(brand.fetchedAt).toLocaleDateString('tr-TR')}.` : ''}</p>
        <div class="field inline"><label for="br-url">Site</label><input id="br-url" type="url" value="${esc(brand.url)}" style="flex:1">
          <button class="btn btn-sm" type="button" data-brand>🌐 Siteden yenile</button></div>
        <details><summary>Notları gör</summary><pre class="code" data-brand-notes>${esc(brand.notes)}</pre></details>
        <p class="error" role="alert" data-brand-err></p>
      </section>
      <section class="card"><h3>📥 Zapier / Make / n8n ile ölçüm gönderme</h3>
        <p class="muted">Reklam platformundan gelen günlük veriyi bu adrese POST edin. Anahtar yalnızca bir kez gösterilir; sunucuda özeti saklanır.</p>
        <pre class="code">POST ${esc(url)}
Authorization: Bearer &lt;anahtar&gt;
Content-Type: application/json

{"campaign_id": 12, "rows": [{"day": "2026-09-20", "channel": "Instagram", "lang": "de",
  "impressions": 10000, "clicks": 200, "conversions": 10, "spend": 500}]}</pre>
        <button class="btn" type="button" data-rotate>${s.hasIngestToken ? '🔄 Yeni anahtar üret (eskisi geçersiz olur)' : '🔑 Anahtar oluştur'}</button>
        <p data-token role="status"></p>
      </section>
      <section class="card"><h3>💾 Yedek</h3>
        <p class="muted">Tüm projeler, kampanyalar, ölçümler ve denetim kaydı tek dosyada. Haftada bir indirip güvenli bir yerde saklayın.</p>
        <a class="btn" href="/api/settings/backup" download>⬇️ Veritabanı yedeğini indir</a>
      </section>
    </div>`;
  d.showModal();
  d.querySelector('[data-close]').onclick = () => d.close();
  d.querySelector('[data-brand]').addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = '🌐 Okunuyor…'; d.querySelector('[data-brand-err]').textContent = '';
    try {
      const r = await api('/settings/brand/import', { method: 'POST', body: { url: d.querySelector('#br-url').value } });
      d.querySelector('[data-brand-notes]').textContent = r.notes;
      e.target.textContent = '✅ Güncellendi';
    } catch (err) { d.querySelector('[data-brand-err]').textContent = err.message; e.target.textContent = '🌐 Siteden yenile'; }
    e.target.disabled = false;
  });
  d.querySelector('[data-rotate]').addEventListener('click', async (e) => {
    if (s.hasIngestToken && !await askConfirm('Eski anahtar hemen geçersiz olur; Zapier/Make senaryolarınızı yeni anahtarla güncellemeniz gerekir.', { title: 'Yeni anahtar üretilsin mi?', ok: '🔄 Üret', danger: true })) return;
    const { token } = await api('/settings/integrations/rotate', { method: 'POST' });
    e.target.remove();
    d.querySelector('[data-token]').innerHTML = `Anahtarınız (şimdi kopyalayın, tekrar gösterilmeyecek):<br><code class="token">${esc(token)}</code>`;
  });
}
