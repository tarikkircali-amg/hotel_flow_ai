// AI görsel üretimi — sağlayıcı bağımsız. Anahtar yalnızca sunucuda.
// Görselin üzerine metin koymayız (metin kreatifte ayrıca, kontrastı garantili çizilir).
const MAX_BYTES = 8 * 1024 * 1024;

const DEFAULT_MODEL = { openai: 'gpt-image-1', fal: 'fal-ai/flux/schnell' };

function imageEnabled(cfg) {
  return (cfg.imageProvider === 'openai' && Boolean(cfg.openaiKey)) || (cfg.imageProvider === 'fal' && Boolean(cfg.falKey));
}

const fail = (msg, status = 502) => Object.assign(new Error(msg), { status });

async function viaOpenAI(cfg, prompt, fetchImpl) {
  const res = await fetchImpl('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: cfg.imageModel || DEFAULT_MODEL.openai, prompt, size: '1024x1024', n: 1, quality: cfg.imageQuality || 'medium' }),
    signal: AbortSignal.timeout(cfg.imageTimeoutMs),
  });
  if (!res.ok) throw fail(`Görsel servisi isteği reddetti (HTTP ${res.status}). Anahtarı ve modeli kontrol edin.`);
  const b64 = (await res.json())?.data?.[0]?.b64_json;
  if (!b64) throw fail('Görsel servisi boş yanıt döndü. Tekrar deneyin.');
  return { mime: 'image/png', b64 };
}

async function viaFal(cfg, prompt, fetchImpl) {
  const res = await fetchImpl(`https://fal.run/${cfg.imageModel || DEFAULT_MODEL.fal}`, {
    method: 'POST',
    headers: { Authorization: `Key ${cfg.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: 'square_hd', num_images: 1 }),
    signal: AbortSignal.timeout(cfg.imageTimeoutMs),
  });
  if (!res.ok) throw fail(`Görsel servisi isteği reddetti (HTTP ${res.status}). Anahtarı ve modeli kontrol edin.`);
  const url = (await res.json())?.images?.[0]?.url;
  if (!/^https:\/\//.test(url || '')) throw fail('Görsel servisi geçerli bir adres döndürmedi.');
  const img = await fetchImpl(url, { signal: AbortSignal.timeout(cfg.imageTimeoutMs) });
  if (!img.ok) throw fail('Üretilen görsel indirilemedi. Tekrar deneyin.');
  const mime = (img.headers.get('content-type') || 'image/jpeg').split(';')[0];
  if (!/^image\/(png|jpeg|webp)$/.test(mime)) throw fail('Görsel servisi desteklenmeyen bir dosya türü döndürdü.');
  return { mime, b64: Buffer.from(await img.arrayBuffer()).toString('base64') };
}

async function generateImage(cfg, basePrompt, fetchImpl = fetch) {
  if (!imageEnabled(cfg)) {
    throw fail('Görsel üretimi kapalı. MOS_IMAGE_PROVIDER (openai veya fal) ve ilgili API anahtarını tanımlayın.', 400);
  }
  const prompt = `${String(basePrompt).slice(0, 1500)}. Advertising photo/illustration, no text, no letters, no logos, no watermarks.`;
  let out;
  try {
    out = cfg.imageProvider === 'openai' ? await viaOpenAI(cfg, prompt, fetchImpl) : await viaFal(cfg, prompt, fetchImpl);
  } catch (err) {
    if (err.status) throw err;
    throw fail('Görsel servisine ulaşılamadı veya zaman aşımı oldu. Tekrar deneyin.');
  }
  if (out.b64.length * 0.75 > MAX_BYTES) throw fail('Üretilen görsel çok büyük (8 MB sınırı).');
  return { ...out, prompt, provider: cfg.imageProvider };
}

module.exports = { generateImage, imageEnabled };
