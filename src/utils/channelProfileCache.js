/**
 * In-memory channel profile cache — cuts N+1 getChannelProfile fan-outs
 * on Shorts / Library / Home after cold start.
 */
const TTL_MS = 60_000;
const store = new Map();

export function getCachedChannelProfile(userId) {
  const key = String(userId || '');
  if (!key) return null;
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedChannelProfile(userId, value) {
  const key = String(userId || '');
  if (!key || value == null) return;
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
  if (store.size > 200) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
}

export async function getChannelProfileCached(fetcher, userId, viewerUserId) {
  const key = String(userId || '');
  if (!key) return null;
  // Viewer-specific subscribe flag — only reuse when same viewer (or guest).
  const cacheKey = `${key}:${viewerUserId || 'guest'}`;
  const hit = store.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await fetcher(userId, viewerUserId);
  store.set(cacheKey, { value, expiresAt: Date.now() + TTL_MS });
  if (store.size > 200) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  return value;
}
