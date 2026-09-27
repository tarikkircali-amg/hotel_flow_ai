// Yayın köprüsü: onaylanmış kampanya paketini yapılandırılmış webhook'a gönderir.
// Kritik eylem → yalnızca "onaylandi" durumunda, açık teyitle, denetim kaydıyla.
// Gönderilen içerik hedef araçta TASLAK olarak açılmalıdır; nihai "yayınla" yine insandadır.
const crypto = require('crypto');
const { renderCreative } = require('./creative');

function buildPayload(c, project) {
  const byAgent = (id) => c.deliverables.find((d) => d.agent_id === id);
  const visual = byAgent('tasarimci')?.data?.visual || null;
  return {
    type: 'miz.campaign.approved',
    sent_at: new Date().toISOString(),
    campaign: { id: c.id, title: c.title, round: c.round, goal: c.goal, channels: c.channels, mode: c.mode },
    project: { name: project.name, url: project.url || null },
    publish_as: 'draft',
    // Kreatifler SVG metni olarak gömülü: alıcının sunucumuza erişmesi (ve oturum) gerekmez.
    creatives: visual ? Object.fromEntries(['square', 'story', 'wide']
      .map((f) => [f, { mime: 'image/svg+xml', svg: renderCreative(visual, { format: f, brand: project.name }) }])) : {},
    visual,
    deliverables: c.deliverables.map((d) => ({ agent: d.agent_id, title: d.title, confidence: d.confidence, body_markdown: d.body })),
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
