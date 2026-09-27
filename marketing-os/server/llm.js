// Claude API katmanı. Anahtar yalnızca sunucu ortam değişkeninde.
// Yapılandırılmış çıktı (JSON şema) ile her ajan aynı biçimde teslim eder.
const Anthropic = require('@anthropic-ai/sdk');

const str = { type: 'string' };
const strArr = { type: 'array', items: str };

const BASE_PROPS = {
  status_line: str,
  title: str,
  body_markdown: str,
  highlights: strArr,
  confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  open_questions: strArr,
};

const VISUAL = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'subline', 'cta', 'bg', 'fg', 'accent', 'image_prompt'],
  properties: {
    headline: str, subline: str, cta: str,
    bg: str, fg: str, accent: str, image_prompt: str,
  },
};

const LOCAL_VISUAL = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'subline', 'cta'],
  properties: { headline: str, subline: str, cta: str },
};

function schemaFor(agentId) {
  const props = { ...BASE_PROPS };
  if (agentId === 'tasarimci') props.visual = VISUAL;
  if (agentId === 'lokal') { props.visual = LOCAL_VISUAL; props.back_translation = str; }
  return { type: 'object', additionalProperties: false, required: Object.keys(props), properties: props };
}

function createClient(cfg) {
  if (!cfg.anthropicKey) return null;
  return new Anthropic({ apiKey: cfg.anthropicKey, timeout: cfg.llmTimeoutMs, maxRetries: 2 });
}

// Tek ajan adımı. Hata olursa anlaşılır bir Error fırlatır (iç ayrıntı sızdırmadan).
const runAgent = (client, cfg, { agentId, system, prompt }) =>
  runJSON(client, cfg, { system, prompt, schema: schemaFor(agentId) });

// Yapılandırılmış JSON çıktılı genel çağrı.
async function runJSON(client, cfg, { system, prompt, schema }) {
  let response;
  try {
    response = await client.messages.create({
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      system,
      output_config: { effort: cfg.effort, format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (err) {
    throw friendly(err);
  }
  if (response.stop_reason === 'refusal') {
    throw new Error('AI bu adımı güvenlik gerekçesiyle üretmedi. Brifi gözden geçirip revize isteyin.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('AI yanıtı uzunluk sınırına takıldı. MOS_MAX_TOKENS değerini artırıp yeniden deneyin.');
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('AI yanıtı beklenen biçimde gelmedi. Adımı yeniden deneyin.');
  }
}

function friendly(err) {
  if (err instanceof Anthropic.AuthenticationError) return new Error('Anthropic API anahtarı geçersiz. ANTHROPIC_API_KEY değerini kontrol edin.');
  if (err instanceof Anthropic.RateLimitError) return new Error('AI hız sınırına ulaşıldı. Birkaç dakika sonra yeniden deneyin.');
  if (err instanceof Anthropic.BadRequestError) return new Error('AI isteği reddedildi (model adı/ayar hatalı olabilir). MOS_MODEL ayarını kontrol edin.');
  if (err instanceof Anthropic.APIConnectionError) return new Error('AI servisine bağlanılamadı. İnternet bağlantısını kontrol edip yeniden deneyin.');
  if (err instanceof Anthropic.APIError) return new Error(`AI servisi geçici bir hata verdi (${err.status}). Yeniden deneyin.`);
  return new Error('AI adımı beklenmedik şekilde başarısız oldu. Yeniden deneyin.');
}

module.exports = { createClient, runAgent, runJSON, schemaFor };
