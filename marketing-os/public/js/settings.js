// Ayarlar: sistem durumu ve Zapier/Make ile otomatik ölçüm alımı anahtarı.
import { api } from './api.js';
import { esc } from './office.js';
import { dlg } from './panels.js';

const row = (ok, label, hint) => `<li>${ok ? '✅' : '⚪'} <strong>${label}</strong> — <span class="muted">${hint}</span></li>`;

export async function openSettings(me) {
  const s = await api('/settings/integrations');
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
  d.querySelector('[data-rotate]').addEventListener('click', async (e) => {
    if (s.hasIngestToken && !confirm('Eski anahtar hemen geçersiz olacak. Devam edilsin mi?')) return;
    const { token } = await api('/settings/integrations/rotate', { method: 'POST' });
    e.target.remove();
    d.querySelector('[data-token]').innerHTML = `Anahtarınız (şimdi kopyalayın, tekrar gösterilmeyecek):<br><code class="token">${esc(token)}</code>`;
  });
}
