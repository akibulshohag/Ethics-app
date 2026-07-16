import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';
import { browseAreaLabel, extractUkPostcodeFromText } from '../utils/ukPostcode';
import { formatCityCountryPostcodeLine } from '../utils/locationFormat';
import { geocodeAddress } from '../utils/geolocation';

export const LOCATION_STORAGE_KEY = 'USER_LOCATION_SELECTION';
export const ORDER_DELIVERY_STORAGE_KEY = 'ORDER_DELIVERY_ADDRESS';
export const LOCATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hasValidCoords(loc) {
  if (!loc || typeof loc !== 'object') return false;
  const lat = loc.lat != null ? Number(loc.lat) : null;
  const lng = loc.lng != null ? Number(loc.lng) : null;
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

/** Normalize saved/backend location into browse location shape. */
export function normalizeBrowseLocation(saved) {
  if (!hasValidCoords(saved)) return null;
  const lat = Number(saved.lat);
  const lng = Number(saved.lng);
  const postcode = String(saved.postcode || '').trim();
  const addressText = String(saved.addressText || '').trim();
  const areaLabel =
    String(saved.areaLabel || '').trim() ||
    formatCityCountryPostcodeLine({ addressText, postcode }) ||
    browseAreaLabel({ postcode, addressText, areaLabel: '' });
  return { lat, lng, postcode, addressText, areaLabel };
}

/** Home stack route with location params when browse location exists. */
export function homeRouteForBrowseLocation(loc) {
  if (!loc) return { name: 'HomeOneScreen' };
  return {
    name: 'HomeOneScreen',
    params: {
      selectedLocation: { lat: loc.lat, lng: loc.lng },
      addressText: loc.addressText || '',
      postcode: loc.postcode || '',
    },
  };
}

export function browseLocationFromUserProfile(userData) {
  if (!userData || typeof userData !== 'object') return null;
  const lat =
    userData.latitude != null
      ? Number(userData.latitude)
      : userData.lat != null
        ? Number(userData.lat)
        : null;
  const lng =
    userData.longitude != null
      ? Number(userData.longitude)
      : userData.lng != null
        ? Number(userData.lng)
        : null;
  const addressText = String(userData.address || '').trim();
  const postcode =
    String(userData.postcode || '').trim() ||
    extractUkPostcodeFromText(addressText) ||
    '';
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    addressText
  ) {
    const areaLabel = formatCityCountryPostcodeLine({
      addressText,
      postcode,
    });
    return normalizeBrowseLocation({
      lat,
      lng,
      postcode,
      addressText,
      areaLabel,
    });
  }
  return null;
}

function buildBrowseLocationFromUserProfile(userData) {
  return browseLocationFromUserProfile(userData);
}

async function geocodeUserProfileAddress(userData) {
  const postcode = String(userData?.postcode || '').trim();
  const addressText = String(userData?.address || '').trim();
  const queries = [
    postcode,
    addressText,
    postcode ? `${postcode}, United Kingdom` : '',
    addressText ? `${addressText}, United Kingdom` : '',
  ].filter((q, i, arr) => q && arr.indexOf(q) === i);
  for (const query of queries) {
    try {
      const coords = await geocodeAddress(query);
      if (coords?.lat != null && coords?.lng != null) {
        return normalizeBrowseLocation({
          lat: coords.lat,
          lng: coords.lng,
          postcode,
          addressText,
        });
      }
    } catch (_) {}
  }
  return null;
}

/** Profile address + coordinates (geocode when lat/lng missing). */
export async function resolveProfileBrowseLocation(userData) {
  const fromProfile = buildBrowseLocationFromUserProfile(userData);
  if (fromProfile) return fromProfile;
  return geocodeUserProfileAddress(userData);
}

/** Resolve browse location from saved choice, storage, or profile address. */
export async function resolveUserBrowseLocation(userData) {
  const backendLoc = userData?.savedLastLocation;
  const fromBackend = normalizeBrowseLocation(backendLoc);
  if (fromBackend) return fromBackend;
  const stored = await loadStoredBrowseLocation(userData?.id);
  const fromStored = normalizeBrowseLocation(stored);
  if (fromStored) return fromStored;
  return resolveProfileBrowseLocation(userData);
}

/**
 * After login/sign-up: prefer profile coords / saved browse pick.
 * Does NOT await geocoding — that can take tens of seconds and blocks home.
 * Use resolveProfileBrowseLocation() in the background when this returns null
 * but the user still has an address/postcode.
 */
export async function resolvePostLoginBrowseLocation(userData) {
  const fromProfile = buildBrowseLocationFromUserProfile(userData);
  if (fromProfile) return fromProfile;
  const backendLoc = userData?.savedLastLocation;
  const fromBackend = normalizeBrowseLocation(backendLoc);
  if (fromBackend) return fromBackend;
  const stored = await loadStoredBrowseLocation(userData?.id);
  return normalizeBrowseLocation(stored);
}

/** True when we should background-geocode after a fast login navigation. */
export function shouldBackgroundGeocodeProfile(userData, browseLoc) {
  if (browseLoc) return false;
  const postcode = String(userData?.postcode || '').trim();
  const addressText = String(userData?.address || '').trim();
  return !!(postcode || addressText);
}

/**
 * Persist browse location locally and on backend when logged in.
 */
export async function persistBrowseLocation({
  userId,
  lat,
  lng,
  postcode = '',
  addressText = '',
  areaLabel = '',
}) {
  if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return;
  }
  const payload = {
    userId: userId || null,
    coords: { lat: Number(lat), lng: Number(lng) },
    postcode: String(postcode || '').trim(),
    addressText: String(addressText || '').trim(),
    areaLabel: String(areaLabel || '').trim(),
    savedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}
  if (userId) {
    saveLastLocationToBackend({
      lat: payload.coords.lat,
      lng: payload.coords.lng,
      addressText: payload.addressText,
      postcode: payload.postcode,
      areaLabel: payload.areaLabel,
    }).catch(() => {});
  }
  return payload;
}

export async function loadStoredBrowseLocation(userId) {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const coords = saved?.coords || { lat: saved?.lat, lng: saved?.lng };
    const lat = coords?.lat != null ? Number(coords.lat) : null;
    const lng = coords?.lng != null ? Number(coords.lng) : null;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const sameUser =
      saved?.userId == null || userId == null
        ? true
        : String(saved.userId) === String(userId);
    const savedAt = saved?.savedAt != null ? Number(saved.savedAt) : null;
    const fresh = savedAt == null || Date.now() - savedAt <= LOCATION_TTL_MS;
    if (!sameUser || !fresh) return null;
    return {
      lat,
      lng,
      postcode: saved.postcode || '',
      addressText: saved.addressText || '',
      areaLabel: saved.areaLabel || '',
    };
  } catch (_) {
    return null;
  }
}

/** Last delivery address used at checkout — separate from profile / home browse. */
export async function persistOrderDeliveryAddress({
  userId,
  addressText,
  postcode = '',
  lat,
  lng,
}) {
  const addr = String(addressText || '').trim();
  if (!addr) return null;
  const payload = {
    userId: userId || null,
    addressText: addr,
    postcode: String(postcode || '').trim(),
    ...(lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      ? { lat: Number(lat), lng: Number(lng) }
      : {}),
    savedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(ORDER_DELIVERY_STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}
  return payload;
}

export async function loadOrderDeliveryAddress(userId) {
  try {
    const raw = await AsyncStorage.getItem(ORDER_DELIVERY_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const addr = String(saved?.addressText || '').trim();
    if (!addr) return null;
    const sameUser =
      saved?.userId == null || userId == null
        ? true
        : String(saved.userId) === String(userId);
    if (!sameUser) return null;
    return {
      addressText: addr,
      postcode: String(saved?.postcode || '').trim(),
      lat: saved?.lat != null ? Number(saved.lat) : null,
      lng: saved?.lng != null ? Number(saved.lng) : null,
    };
  } catch (_) {
    return null;
  }
}

/**
 * Save user's last selected location to backend (used after login on any device).
 */
export async function saveLastLocationToBackend({
  lat,
  lng,
  addressText = '',
  postcode = '',
  areaLabel = '',
}) {
  if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return;
  }
  try {
    await request({
      endpoint: 'users/saved-last-location',
      method: 'PATCH',
      body: {
        lat: Number(lat),
        lng: Number(lng),
        addressText: String(addressText || '').trim(),
        postcode: String(postcode || '').trim(),
        areaLabel: String(areaLabel || '').trim(),
      },
    });
  } catch (e) {
    // non-blocking
  }
}

/** Default radius for nearby restaurant promotions (km). */
export const PROMO_NEARBY_RADIUS_KM = 50;

/** Viewer coordinates for nearby promotions: home browse area first, then saved profile location. */
export function resolvePromoViewerCoords(browseLocation, userData) {
  if (hasValidCoords(browseLocation)) {
    return {
      lat: Number(browseLocation.lat),
      lng: Number(browseLocation.lng),
    };
  }
  const saved = userData?.savedLastLocation;
  if (hasValidCoords(saved)) {
    return { lat: Number(saved.lat), lng: Number(saved.lng) };
  }
  const uLat =
    userData?.latitude != null ? Number(userData.latitude) : null;
  const uLng =
    userData?.longitude != null ? Number(userData.longitude) : null;
  if (
    uLat != null &&
    uLng != null &&
    Number.isFinite(uLat) &&
    Number.isFinite(uLng)
  ) {
    return { lat: uLat, lng: uLng };
  }
  const fromProfile = browseLocationFromUserProfile(userData);
  if (fromProfile) {
    return { lat: fromProfile.lat, lng: fromProfile.lng };
  }
  return null;
}
