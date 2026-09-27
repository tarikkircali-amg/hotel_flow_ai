// Organizasyon bazlı canlı olay yayını (Server-Sent Events).
// Bir organizasyonun olayı asla başka bir organizasyona gitmez.
const subscribers = new Map(); // orgId -> Set<res>

function subscribe(orgId, res) {
  if (!subscribers.has(orgId)) subscribers.set(orgId, new Set());
  subscribers.get(orgId).add(res);
  return () => subscribers.get(orgId)?.delete(res);
}

function publish(orgId, type, payload) {
  const set = subscribers.get(orgId);
  if (!set) return;
  const msg = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) res.write(msg);
}

module.exports = { subscribe, publish };
