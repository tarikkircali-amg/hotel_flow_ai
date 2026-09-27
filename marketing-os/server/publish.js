// Yayın köprüsü: onaylanmış kampanya paketini yapılandırılmış webhook'a gönderir.
// Kritik eylem → yalnızca "onaylandi" durumunda, açık teyitle, denetim kaydıyla.
// Gönderilen içerik hedef araçta TASLAK olarak açılmalıdır; nihai "yayınla" yine insandadır.
const crypto = require('crypto');
const { parseLanguages, byCode } = require('./languages');

// creatives: { [lang]: { square: svg, story: svg, wide: svg } } — SVG metni gömülü (alıcının oturumu gerekmez).
function buildPayload(c, project, creatives = {}) {
  const byAgent = (id) => c.deliverables.find((d) => d.agent_id === id);
  const visual = byAgent('tasarimci')?.data?.visual || null;
  return {
    type: 'miz.campaign.approved',
    sent_at: new Date().toISOString(),
    campaign: { id: c.id, title: c.title, round: c.round, goal: c.goal, channels: c.channels, mode: c.mode,
      languages: parseLanguages(c.languages).map((code) => ({ code, dir: byCode(code).dir })) },
    project: { name: project.name, url: project.url || null },
    publish_as: 'draft',
    creatives: Object.fromEntries(Object.entries(creatives).map(([lang, set]) =>
      [lang, Object.fromEntries(Object.entries(set).map(([f, svg]) => [f, { mime: 'image/svg+xml', svg }]))])),
    visual,
    deliverables: c.deliverables.map((d) => ({ agent: d.agent_id, lang: d.data?.lang || 'tr', title: d.title,
      confidence: d.confidence, body_markdown: d.body, ...(d.data?.visual && { visual: d.data.visual }) })),
  };
}

function sign(secret, body) {
  return secret ? `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}` : null;
}

async function sendWebhook(cfg, payload, fetchImpl = fetch) {
  if (!cfg.publishWebhookUrl) {
    throw Object.assign(new Error('Yayın köprüsü kurulu değil. MOS_PUBLISH_WEBHOOK_URL tanımlayın (Zapier/Make/n8n webhook adresi).'), { status: 400 });
  }
  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'MIZ-Marketing-OS' };
  const sig = sign(cfg.publishSecret, body);
  if (sig) headers['X-MOS-Signature'] = sig;
  let res;
  try {
    res = await fetchImpl(cfg.publishWebhookUrl, { method: 'POST', headers, body, signal: AbortSignal.timeout(cfg.publishTimeoutMs) });
  } catch {
    throw Object.assign(new Error('Yayın aracına ulaşılamadı. Webhook adresini ve bağlantıyı kontrol edip tekrar deneyin.'), { status: 502 });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`Yayın aracı isteği kabul etmedi (HTTP ${res.status}). Zapier/Make senaryonuzu kontrol edin.`), { status: 502 });
  }
}

module.exports = { buildPayload, sendWebhook, sign };
