/**
 * Viewer position for distance lines: prefer map/search selection, else logged-in user's saved lat/lng.
 * Accepts { lat, lng } or { viewerLat, viewerLng }.
 */
export const resolveViewerLocationOpts = (locationLike, loggedInUser) => {
  const lat0 =
    locationLike?.lat != null ? locationLike.lat : locationLike?.viewerLat;
  const lng0 =
    locationLike?.lng != null ? locationLike.lng : locationLike?.viewerLng;
  if (lat0 != null && lng0 != null) {
    const viewerLat = Number(lat0);
    const viewerLng = Number(lng0);
    if (
      !Number.isNaN(viewerLat) &&
      !Number.isNaN(viewerLng) &&
      Number.isFinite(viewerLat) &&
      Number.isFinite(viewerLng)
    ) {
      return { viewerLat, viewerLng };
    }
  }
  const u = loggedInUser || {};
  if (u.latitude != null && u.longitude != null) {
    const viewerLat = Number(u.latitude);
    const viewerLng = Number(u.longitude);
    if (
      !Number.isNaN(viewerLat) &&
      !Number.isNaN(viewerLng) &&
      Number.isFinite(viewerLat) &&
      Number.isFinite(viewerLng)
    ) {
      return { viewerLat, viewerLng };
    }
  }
  return undefined;
};

/**
 * Creator / content coordinates from a video or short API payload (for distance to viewer).
 */
export const getOwnerLatLngFromMediaPayload = (v = {}) => {
  const u = v.user || v.creator || v.owner || v.restaurant || {};
  const r = v.restaurant && typeof v.restaurant === 'object' ? v.restaurant : null;
  const lat =
    u.latitude ??
    u.lat ??
    r?.latitude ??
    r?.lat ??
    v.creatorLatitude ??
    v.latitude ??
    (v.creator && v.creator.latitude);
  const lng =
    u.longitude ??
    u.lng ??
    r?.longitude ??
    r?.lng ??
    v.creatorLongitude ??
    v.longitude ??
    (v.creator && v.creator.longitude);
  if (lat == null || lng == null) return { lat: null, lng: null };
  const a = Number(lat);
  const b = Number(lng);
  if (
    Number.isNaN(a) ||
    Number.isNaN(b) ||
    !Number.isFinite(a) ||
    !Number.isFinite(b)
  ) {
    return { lat: null, lng: null };
  }
  return { lat: a, lng: b };
};

/** Great-circle distance in km. Returns null if any coordinate is invalid. */
export const distanceKmBetween = (lat1, lng1, lat2, lng2) => {
  const a = Number(lat1);
  const b = Number(lng1);
  const c = Number(lat2);
  const d = Number(lng2);
  if (
    [a, b, c, d].some(
      x => x == null || Number.isNaN(x) || !Number.isFinite(x),
    )
  ) {
    return null;
  }
  const R = 6371;
  const dLat = ((c - a) * Math.PI) / 180;
  const dLng = ((d - b) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a * Math.PI) / 180) *
      Math.cos((c * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
};

/** Compact label e.g. "1.2 km" or "850 m". */
export const formatDistanceKm = km => {
  if (km == null || Number.isNaN(km) || !Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

/** Owner delivery tax/charge by distance tier (0-10, 11-20, 21-30 km). */
export const resolveTaxChargeForDistanceKm = (distanceKm, ownerProfile) => {
  if (distanceKm == null || !Number.isFinite(Number(distanceKm))) return 0;
  const d = Number(distanceKm);
  const pick = value => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  if (d <= 10) return pick(ownerProfile?.taxCharge0To10Km);
  if (d <= 20) return pick(ownerProfile?.taxCharge11To20Km);
  if (d <= 30) return pick(ownerProfile?.taxCharge21To30Km);
  return pick(ownerProfile?.taxCharge21To30Km);
};
