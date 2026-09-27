// Sunucu istemcisi. Oturum HttpOnly çerezde; istemcide anahtar/token tutulmaz.
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'İşlem tamamlanamadı. Tekrar deneyin.', res.status);
  return data;
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
