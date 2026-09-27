// MİZ Marketing OS — merkezi yapılandırma. Hiçbir değer kod içine gömülmez;
// hepsi ortam değişkeninden okunur, burada yalnızca güvenli varsayılanlar var.
const path = require('path');

const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);

module.exports = {
  port: num(process.env.PORT, 4000),
  dbFile: process.env.MOS_DB_FILE || path.join(__dirname, '..', 'data', 'marketing-os.db'),
  adminUser: process.env.MOS_ADMIN_USER || 'admin',
  adminPassword: process.env.MOS_ADMIN_PASSWORD || '', // boşsa ilk açılışta rastgele üretilir
  orgName: process.env.MOS_ORG_NAME || 'My İnovatif Zeka',
  sessionTtlMs: num(process.env.MOS_SESSION_TTL_HOURS, 168) * 3600 * 1000,
  cookieSecure: process.env.MOS_COOKIE_SECURE === '1',

  // AI — anahtar yalnızca sunucuda. Yoksa sistem "Demo modu"nda şablon çıktı üretir.
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.MOS_MODEL || 'claude-opus-5',
  effort: process.env.MOS_EFFORT || 'medium',
  maxTokens: num(process.env.MOS_MAX_TOKENS, 8000),
  llmTimeoutMs: num(process.env.MOS_LLM_TIMEOUT_MS, 180000),

  // Demo modunda karakterlerin ekranda izlenebilmesi için adım gecikmesi
  demoDelayMs: num(process.env.MOS_DEMO_DELAY_MS, 2500),
  // Bir ajanın önceki çıktılardan göreceği azami karakter (bağlam şişmesin)
  contextCharsPerDeliverable: num(process.env.MOS_CONTEXT_CHARS, 3500),
};

// Yayın köprüsü (isteğe bağlı): onaylı paket, kurucu "Yayına gönder" dediğinde
// bu webhook'a imzalı JSON olarak gider (Zapier / Make / n8n → Meta, Buffer, Google Ads taslakları).
module.exports.publishWebhookUrl = process.env.MOS_PUBLISH_WEBHOOK_URL || '';
module.exports.publishSecret = process.env.MOS_PUBLISH_SECRET || '';
module.exports.publishTimeoutMs = Number(process.env.MOS_PUBLISH_TIMEOUT_MS) || 15000;

// AI görsel üretimi (isteğe bağlı). Claude görsel üretmez; ayrı bir sağlayıcı gerekir.
module.exports.imageProvider = (process.env.MOS_IMAGE_PROVIDER || '').toLowerCase(); // openai | fal | ''
module.exports.openaiKey = process.env.OPENAI_API_KEY || '';
module.exports.falKey = process.env.FAL_KEY || '';
module.exports.imageModel = process.env.MOS_IMAGE_MODEL || '';
module.exports.imageTimeoutMs = Number(process.env.MOS_IMAGE_TIMEOUT_MS) || 120000;

// Ölçüm ve web sitesi
module.exports.currency = process.env.MOS_CURRENCY || 'TRY';
module.exports.siteFetchTimeoutMs = Number(process.env.MOS_SITE_TIMEOUT_MS) || 10000;
module.exports.trustProxy = process.env.MOS_TRUST_PROXY || ''; // Hostinger/Nginx arkasında "1"
