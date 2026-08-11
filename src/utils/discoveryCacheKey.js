/** Stable cache key from viewer location + user (guest vs logged-in menus). */
export function buildDiscoveryCacheKey(locationOpts, userId) {
  const lat = Number(locationOpts?.viewerLat ?? locationOpts?.lat);
  const lng = Number(locationOpts?.viewerLng ?? locationOpts?.lng);
  const latKey = Number.isFinite(lat) ? Math.round(lat * 100) : 'na';
  const lngKey = Number.isFinite(lng) ? Math.round(lng * 100) : 'na';
  const uid = userId != null && String(userId).trim() ? String(userId) : 'guest';
  return `${latKey}_${lngKey}_${uid}`;
}

export const DISCOVERY_STALE_MS = 10 * 60 * 1000;

export function isDiscoveryCacheFresh(fetchedAt, cacheKey, expectedKey) {
  if (!expectedKey || cacheKey !== expectedKey) return false;
  if (!fetchedAt) return false;
  return Date.now() - fetchedAt < DISCOVERY_STALE_MS;
}
