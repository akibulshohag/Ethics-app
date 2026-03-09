/**
 * Safe access to @react-native-community/geolocation.
 * Requests location permission before getting position (Android).
 */
import { Platform, PermissionsAndroid } from 'react-native';

/**
 * Reverse geocode: get address string from lat/lng using Google Geocoding API.
 * Use when user sets location via map or "Use my location" so address is not null.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string|null>} formatted_address or null
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (!key || !key.trim()) return null;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.status === 'OK' && data?.results?.[0]?.formatted_address) {
      return data.results[0].formatted_address;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Geocode address string to lat/lng using Google Geocoding API.
 * @param {string} address - Address string to geocode
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
const COUNTRY_REGION = {
  bangladesh: 'bd',
  bd: 'bd',
  india: 'in',
  in: 'in',
  uk: 'gb',
  'united kingdom': 'gb',
  usa: 'us',
  'united states': 'us',
  us: 'us',
};

export async function geocodeAddress(address) {
  if (!address || !String(address).trim()) return null;
  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (!key || !key.trim()) return null;
    const raw = String(address).trim();
    const encoded = encodeURIComponent(raw);
    const lower = raw.toLowerCase();
    let region =
      Object.keys(COUNTRY_REGION).find(k => lower.includes(k)) || null;
    if (!region && (lower.includes('dhaka') || lower.includes('mirpur') || lower.includes('chittagong') || lower.includes('sylhet'))) {
      region = 'bd';
    }
    const regionParam = region ? `&region=${COUNTRY_REGION[region]}` : '';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${key}${regionParam}`;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Common Bangladesh areas (Dhaka and others) – shown first when user types (Pathao-style).
 * On select we geocode the full string to get coords. Add more as needed.
 */
const BD_AREAS = [
  'Mirpur 1, Dhaka', 'Mirpur 2, Dhaka', 'Mirpur 6, Dhaka', 'Mirpur 10, Dhaka', 'Mirpur 11, Dhaka', 'Mirpur 12, Dhaka', 'Mirpur 13, Dhaka', 'Mirpur 14, Dhaka',
  'Mirpur Section 1, Dhaka', 'Mirpur Section 2, Dhaka', 'Mirpur DOHS, Dhaka',
  'Dhanmondi, Dhaka', 'Dhanmondi 1, Dhaka', 'Dhanmondi 2, Dhaka', 'Dhanmondi 3, Dhaka', 'Dhanmondi 4, Dhaka', 'Dhanmondi 5, Dhaka', 'Dhanmondi 6, Dhaka', 'Dhanmondi 7, Dhaka', 'Dhanmondi 8, Dhaka', 'Dhanmondi 9, Dhaka', 'Dhanmondi 10, Dhaka',
  'Gulshan 1, Dhaka', 'Gulshan 2, Dhaka', 'Gulshan 3, Dhaka', 'Gulshan 4, Dhaka',
  'Banani, Dhaka', 'Baridhara, Dhaka', 'Bashundhara, Dhaka', 'Uttara, Dhaka', 'Uttara Sector 1, Dhaka', 'Uttara Sector 2, Dhaka', 'Uttara Sector 3, Dhaka', 'Uttara Sector 4, Dhaka', 'Uttara Sector 5, Dhaka', 'Uttara Sector 6, Dhaka', 'Uttara Sector 7, Dhaka',
  'Mohammadpur, Dhaka', 'Motijheel, Dhaka', 'Farmgate, Dhaka', 'Shyamoli, Dhaka', 'Adabor, Dhaka', 'Hazaribagh, Dhaka', 'Lalmatia, Dhaka', 'Mohakhali, Dhaka', 'Tejgaon, Dhaka', 'Niketon, Dhaka', 'Badda, Dhaka', 'Rampura, Dhaka', 'Malibagh, Dhaka', 'Moghbazar, Dhaka', 'Paltan, Dhaka', 'Old Dhaka, Dhaka',
  'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Comilla', 'Gazipur', 'Narayanganj', 'Savar, Dhaka',
];

/** Approximate coords for BD areas so selecting an area always redirects and shows feed even if geocode fails. */
const DHAKA_COORDS = { lat: 23.8103, lng: 90.4125 };
const BD_AREA_COORDS = {
  'Chittagong': { lat: 22.3569, lng: 91.7832 },
  'Sylhet': { lat: 24.8949, lng: 91.8687 },
  'Rajshahi': { lat: 24.3745, lng: 88.6042 },
  'Khulna': { lat: 22.8456, lng: 89.5403 },
  'Comilla': { lat: 23.4619, lng: 91.1850 },
  'Gazipur': { lat: 23.9999, lng: 90.4203 },
  'Narayanganj': { lat: 23.6238, lng: 90.5000 },
};

/**
 * Return fallback coords for a BD area so we can always show HomeOneScreen with area-wise data.
 * @param {string} areaDescription - e.g. "Mirpur 10, Dhaka"
 * @returns {{ lat: number, lng: number } | null}
 */
export function getFallbackCoordsForBDArea(areaDescription) {
  if (!areaDescription || !String(areaDescription).trim()) return null;
  const trimmed = String(areaDescription).trim();
  if (BD_AREA_COORDS[trimmed]) return BD_AREA_COORDS[trimmed];
  if (BD_AREAS.includes(trimmed)) return DHAKA_COORDS;
  const lower = trimmed.toLowerCase();
  if (lower.includes('chittagong')) return BD_AREA_COORDS['Chittagong'];
  if (lower.includes('sylhet')) return BD_AREA_COORDS['Sylhet'];
  if (lower.includes('rajshahi')) return BD_AREA_COORDS['Rajshahi'];
  if (lower.includes('khulna')) return BD_AREA_COORDS['Khulna'];
  if (lower.includes('comilla')) return BD_AREA_COORDS['Comilla'];
  if (lower.includes('gazipur')) return BD_AREA_COORDS['Gazipur'];
  if (lower.includes('narayanganj')) return BD_AREA_COORDS['Narayanganj'];
  if (lower.includes('dhaka') || lower.includes('mirpur') || lower.includes('dhanmondi') || lower.includes('gulshan') || lower.includes('uttara') || lower.includes('banani') || lower.includes('mohammadpur') || lower.includes('savar')) {
    return DHAKA_COORDS;
  }
  return null;
}

/**
 * Get address/place suggestions as user types. Shows areas first (e.g. "Mirpur 10"), then on select that address is used.
 * Order: (1) Local BD areas list, (2) New Places API, (3) Legacy Autocomplete, (4) Geocoding single result.
 */
export async function getPlaceSuggestions(input) {
  if (!input || !String(input).trim()) return [];
  const trimmed = String(input).trim();
  const lower = trimmed.toLowerCase();

  // 1) Local areas – show immediately when user types (e.g. "mirpur 10" → Mirpur 10, Mirpur 1, ...)
  const localMatches = BD_AREAS.filter(area => area.toLowerCase().includes(lower));
  if (localMatches.length > 0) {
    return localMatches.map(description => ({ description, place_id: '' }));
  }

  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (!key || !key.trim()) return [];

    // 2) New Places API (v1)
    const newSuggestions = await getPlaceSuggestionsNewApi(key, trimmed);
    if (newSuggestions.length > 0) return newSuggestions;

    // 3) Legacy Place Autocomplete
    const encoded = encodeURIComponent(trimmed);
    const legacyUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encoded}&key=${key}&region=bd`;
    const legacyRes = await fetch(legacyUrl);
    const legacyData = await legacyRes.json();
    const predictions = (legacyData?.predictions || []).map(p => ({
      description: p.description || '',
      place_id: p.place_id || '',
    })).filter(p => p.description && p.place_id);
    if (predictions.length > 0) return predictions;

    // 4) Geocoding – one suggestion
    const fallback = await geocodeAddressWithFormatted(trimmed);
    if (fallback) return [fallback];
    return [];
  } catch (e) {
    const fallback = await geocodeAddressWithFormatted(trimmed);
    if (fallback) return [fallback];
    return [];
  }
}

/**
 * New Places API (v1) autocomplete – POST, returns place predictions (areas/addresses first).
 */
async function getPlaceSuggestionsNewApi(key, input) {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ['bd'],
        locationBias: {
          circle: {
            center: { latitude: 23.8103, longitude: 90.4125 },
            radius: 50000,
          },
        },
      }),
    });
    const data = await res.json();
    const suggestions = data?.suggestions || [];
    return suggestions
      .filter(s => s.placePrediction)
      .map(s => ({
        description: s.placePrediction?.text?.text || '',
        place_id: s.placePrediction?.placeId || s.placePrediction?.place?.replace('places/', '') || '',
      }))
      .filter(p => p.description && p.place_id);
  } catch (e) {
    return [];
  }
}

/**
 * Geocode and return one suggestion object for autocomplete fallback.
 * @returns {Promise<{ description: string, place_id: string } | null>}
 */
async function geocodeAddressWithFormatted(address) {
  if (!address || !String(address).trim()) return null;
  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (!key || !key.trim()) return null;
    const encoded = encodeURIComponent(String(address).trim());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first?.geometry?.location) return null;
    const desc = first.formatted_address || address;
    return { description: desc, place_id: '' };
  } catch (e) {
    return null;
  }
}

/**
 * Get lat/lng for a selected place (Google Place Details).
 * @param {string} placeId - place_id from autocomplete
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function getCoordsFromPlaceId(placeId) {
  if (!placeId || !String(placeId).trim()) return null;
  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (!key || !key.trim()) return null;
    const encoded = encodeURIComponent(String(placeId).trim());
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encoded}&key=${key}&fields=geometry`;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data?.result?.geometry?.location;
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch (e) {
    return null;
  }
}

let _geolocation = null;
let _checked = false;

export function getGeolocation() {
  if (_checked) return _geolocation;
  _checked = true;
  try {
    _geolocation = require('@react-native-community/geolocation').default;
  } catch (e) {
    _geolocation = null;
  }
  return _geolocation;
}

/**
 * Request location permission (Android). iOS prompts on first getCurrentPosition.
 */
async function requestLocationPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location permission',
        message: 'eatix needs your location to show nearby videos and set your profile location.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    return false;
  }
}

/**
 * Get current position. Requests permission first on Android.
 * @param {function} onSuccess - (position) => {}
 * @param {function} onError - (message: string) => {}
 * @param {object} options - optional { enableHighAccuracy, timeout, maximumAge }
 */
export function getCurrentPositionSafe(onSuccess, onError, options = {}) {
  const Geo = getGeolocation();
  if (!Geo) {
    onError(
      'Location is not available. Rebuild the app after installing the geolocation package.',
    );
    return;
  }

  const doGetPosition = () => {
    const opts = {
      enableHighAccuracy: false, // use network/cell first for faster result; set true only if you need GPS
      timeout: 30000,           // 30 seconds – give device time to get fix
      maximumAge: 60000,        // accept position up to 1 min old to avoid unnecessary wait
      ...options,
    };
    try {
      Geo.getCurrentPosition(
        pos => onSuccess(pos),
        err => {
          const msg = err?.message || 'Could not get location.';
          const code = err?.code;
          if (code === 3 || msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out')) {
            onError(
              'Location request timed out. Turn on device location (GPS/Wi‑Fi), move to an open area, and try again.',
            );
            return;
          }
          if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
            onError('Location permission was not granted. Please enable it in Settings to use "Use my location".');
            return;
          }
          onError(msg);
        },
        opts,
      );
    } catch (e) {
      onError(e?.message || 'Location not available.');
    }
  };

  if (Platform.OS === 'android') {
    requestLocationPermission()
      .then(granted => {
        if (granted) {
          doGetPosition();
        } else {
          onError(
            'Location permission was not granted. To see nearby content, allow location in Settings > Apps > eatix > Permissions.',
          );
        }
      })
      .catch(() => {
        onError('Could not request location permission.');
      });
  } else {
    doGetPosition();
  }
}
