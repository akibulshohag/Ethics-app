/**
 * Safe access to @react-native-community/geolocation.
 * Requests location permission before getting position (Android).
 */
import { Platform, PermissionsAndroid } from 'react-native';
import { normalizeUkPostcode } from './ukPostcode';

/**
 * Build a short address (e.g. "London Ea, London A1") from Google address_components.
 * Prefers locality/sublocality + postal_code for readable display.
 */
function shortAddressFromGoogleResult(result) {
  if (!result?.address_components?.length) return null;
  const comp = result.address_components;
  const get = (type) => comp.find(c => c.types.includes(type))?.long_name || comp.find(c => c.types.includes(type))?.short_name || null;
  const locality = get('locality') || get('sublocality') || get('sublocality_level_1') || get('administrative_area_level_2');
  const postal = get('postal_code');
  const area = get('administrative_area_level_1');
  if (locality && postal) return `${locality}, ${postal}`;
  if (locality && area && area !== locality) return `${locality}, ${area}`;
  if (locality) return locality;
  if (postal && area) return `${area}, ${postal}`;
  if (postal) return postal;
  return null;
}

/**
 * Reverse geocode using OpenStreetMap Nominatim (no API key). Fallback when Google fails.
 */
async function reverseGeocodeNominatim(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'EatixApp/1.0 (React Native)',
      },
    });
    const data = await res.json();
    const name = data?.display_name || data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county;
    if (name && typeof name === 'string') return name.trim();
    const addr = data?.address;
    if (addr) {
      const parts = [addr.city, addr.town, addr.village, addr.county, addr.state, addr.postcode].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Reverse geocode: get address string from lat/lng (Google first, then Nominatim fallback).
 * Prefers short format like "London Ea, London A1" when possible.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string|null>} address string or null
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (key && key.trim()) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.status === 'OK' && data?.results?.[0]) {
        const first = data.results[0];
        const short = shortAddressFromGoogleResult(first);
        if (short) return short;
        if (first.formatted_address) return first.formatted_address;
      }
    }
    const nominatim = await reverseGeocodeNominatim(lat, lng);
    return nominatim;
  } catch (e) {
    const nominatim = await reverseGeocodeNominatim(lat, lng);
    return nominatim;
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

// UK postcode pattern (e.g. WD5 0AB, SW1A 1AA, M1 1AA) to bias geocoding to UK
const UK_POSTCODE_REGEX = /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/i;

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'EatixApp/1.0 (React Native)',
};

/**
 * UK postcode → lat/lng via postcodes.io (free, no API key). Works for RH7 6AA, WD5 0AB, etc.
 * @returns {Promise<{ lat: number, lng: number, address?: string } | null>}
 */
export async function geocodeUkPostcode(raw) {
  const pc = normalizeUkPostcode(raw);
  if (!pc) return null;

  const compact = pc.replace(/\s+/g, '');
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(compact)}`,
      { headers: { Accept: 'application/json' } },
    );
    const data = await res.json();
    if (data?.status === 200 && data?.result) {
      const r = data.result;
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const parts = [
          r.parish || r.admin_ward,
          r.admin_district || r.region,
          pc,
        ].filter(Boolean);
        return { lat, lng, address: parts.join(', ') };
      }
    }
  } catch (_) {}

  try {
    const q = encodeURIComponent(`${pc}, United Kingdom`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=gb`,
      { headers: NOMINATIM_HEADERS },
    );
    const arr = await res.json();
    const hit = Array.isArray(arr) ? arr[0] : null;
    if (hit?.lat != null && hit?.lon != null) {
      return {
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
        address: hit.display_name || `${pc}, United Kingdom`,
      };
    }
  } catch (_) {}

  const fallback = getFallbackCoordsForUKArea(pc);
  if (fallback) {
    return { ...fallback, address: `${pc}, United Kingdom` };
  }
  return null;
}

/** Forward geocode free-text (non-postcode) via Nominatim when Google fails. */
async function geocodeForwardNominatim(address, countryCode = 'gb') {
  try {
    const q = encodeURIComponent(String(address).trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=${countryCode}`,
      { headers: NOMINATIM_HEADERS },
    );
    const arr = await res.json();
    const hit = Array.isArray(arr) ? arr[0] : null;
    if (hit?.lat != null && hit?.lon != null) {
      return {
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
      };
    }
  } catch (_) {}
  return null;
}

export async function geocodeAddress(address) {
  if (!address || !String(address).trim()) return null;
  const raw = String(address).trim();

  if (UK_POSTCODE_REGEX.test(raw) || normalizeUkPostcode(raw)) {
    const uk = await geocodeUkPostcode(raw);
    if (uk) return { lat: uk.lat, lng: uk.lng };
  }

  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (!key || !key.trim()) {
      const nom = await geocodeForwardNominatim(raw, 'gb');
      return nom;
    }
    const encoded = encodeURIComponent(raw);
    const lower = raw.toLowerCase();
    let region =
      Object.keys(COUNTRY_REGION).find(k => lower.includes(k)) || null;
    if (!region && (lower.includes('dhaka') || lower.includes('mirpur') || lower.includes('chittagong') || lower.includes('sylhet'))) {
      region = 'bd';
    }
    if (!region && UK_POSTCODE_REGEX.test(raw)) {
      region = 'uk';
    }
    const regionParam = region ? `&region=${COUNTRY_REGION[region]}` : '';
    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${key}${regionParam}`;
    let res = await fetch(url);
    let data = await res.json();
    let loc = data?.results?.[0]?.geometry?.location;
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
      return { lat: loc.lat, lng: loc.lng };
    }
    // Retry with ", United Kingdom" when address has UK postcode but first attempt failed (e.g. no region hint)
    if (!region && UK_POSTCODE_REGEX.test(raw)) {
      const withUK = `${raw}, United Kingdom`;
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(withUK)}&key=${key}&region=gb`;
      res = await fetch(url);
      data = await res.json();
      loc = data?.results?.[0]?.geometry?.location;
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
        return { lat: loc.lat, lng: loc.lng };
      }
    }
    const nom = await geocodeForwardNominatim(
      raw,
      region === 'uk' || UK_POSTCODE_REGEX.test(raw) ? 'gb' : 'gb',
    );
    if (nom) return nom;
    if (UK_POSTCODE_REGEX.test(raw) || normalizeUkPostcode(raw)) {
      const uk = await geocodeUkPostcode(raw);
      if (uk) return { lat: uk.lat, lng: uk.lng };
    }
    return null;
  } catch (e) {
    if (UK_POSTCODE_REGEX.test(raw) || normalizeUkPostcode(raw)) {
      const uk = await geocodeUkPostcode(raw);
      if (uk) return { lat: uk.lat, lng: uk.lng };
    }
    return geocodeForwardNominatim(raw, 'gb');
  }
}

/**
 * Common UK / England areas – shown first when user types on landing (app is UK-focused).
 */
const UK_AREAS = [
  'London', 'London EC1', 'London WC1', 'London SW1', 'London W1', 'London E1', 'London N1', 'London SE1',
  'Abbots Langley, Hertfordshire', 'Watford, Hertfordshire', 'Hertfordshire', 'WD5 0AB', 'Langley Road, Abbots Langley',
  'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Sheffield', 'Newcastle', 'Nottingham', 'Southampton',
  'Reading', 'Brighton', 'Oxford', 'Cambridge', 'Cardiff', 'Edinburgh', 'Glasgow', 'Belfast',
  'Croydon', 'Slough', 'Luton', 'Milton Keynes', 'Northampton', 'Leicester', 'Coventry', 'Wolverhampton',
];

/** Default UK map center (England). */
const UK_DEFAULT_COORDS = { lat: 51.5074, lng: -0.1278 };
/** Approximate coords for UK areas (e.g. Abbots Langley WD5, London). */
const UK_AREA_COORDS = {
  'Abbots Langley': { lat: 51.705643, lng: -0.417062 },
  'WD5 0AB': { lat: 51.705643, lng: -0.417062 },
  'Watford': { lat: 51.6563, lng: -0.3962 },
  'Hertfordshire': { lat: 51.8098, lng: -0.2377 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Manchester': { lat: 53.4808, lng: -2.2426 },
  'Birmingham': { lat: 52.4862, lng: -1.8904 },
  'Leeds': { lat: 53.8008, lng: -1.5491 },
  'Liverpool': { lat: 53.4084, lng: -2.9916 },
  'Bristol': { lat: 51.4545, lng: -2.5879 },
  'Sheffield': { lat: 53.3811, lng: -1.4701 },
  'Newcastle': { lat: 54.9783, lng: -1.6178 },
  'Nottingham': { lat: 52.9548, lng: -1.1581 },
  'Southampton': { lat: 50.9097, lng: -1.4044 },
  'Reading': { lat: 51.4543, lng: -0.9781 },
  'Brighton': { lat: 50.8225, lng: -0.1372 },
  'Oxford': { lat: 51.7520, lng: -1.2577 },
  'Cambridge': { lat: 52.2053, lng: 0.1218 },
  'Cardiff': { lat: 51.4816, lng: -3.1791 },
  'Edinburgh': { lat: 55.9533, lng: -3.1883 },
  'Glasgow': { lat: 55.8642, lng: -4.2518 },
  'Belfast': { lat: 54.5973, lng: -5.9301 },
  'Croydon': { lat: 51.3724, lng: -0.1092 },
  'Slough': { lat: 51.5105, lng: -0.5954 },
  'Luton': { lat: 51.8797, lng: -0.4176 },
  'Milton Keynes': { lat: 52.0406, lng: -0.7594 },
  'Northampton': { lat: 52.2405, lng: -0.9027 },
  'Leicester': { lat: 52.6369, lng: -1.1398 },
  'Coventry': { lat: 52.4068, lng: -1.5197 },
  'Wolverhampton': { lat: 52.5862, lng: -2.1289 },
  'RH7 6AA': { lat: 51.1764, lng: -0.0039 },
  'Lingfield': { lat: 51.1764, lng: -0.0039 },
  'RH7': { lat: 51.1764, lng: -0.0039 },
};

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
 * Return fallback coords for a UK/England area (e.g. Abbots Langley, London, WD5).
 * @param {string} areaDescription - e.g. "Abbots Langley, Hertfordshire" or "6 Langley Rd, WD5 0AB"
 * @returns {{ lat: number, lng: number } | null}
 */
export function getFallbackCoordsForUKArea(areaDescription) {
  if (!areaDescription || !String(areaDescription).trim()) return null;
  const trimmed = String(areaDescription).trim();
  if (UK_AREA_COORDS[trimmed]) return UK_AREA_COORDS[trimmed];
  const lower = trimmed.toLowerCase();
  if (lower.includes('abbots langley') || lower.includes('wd5') || lower.includes('langley rd')) return UK_AREA_COORDS['Abbots Langley'];
  if (lower.includes('watford')) return UK_AREA_COORDS['Watford'];
  if (lower.includes('hertfordshire')) return UK_AREA_COORDS['Hertfordshire'];
  if (lower.includes('london')) return UK_AREA_COORDS['London'];
  if (lower.includes('manchester')) return UK_AREA_COORDS['Manchester'];
  if (lower.includes('birmingham')) return UK_AREA_COORDS['Birmingham'];
  if (lower.includes('leeds')) return UK_AREA_COORDS['Leeds'];
  if (lower.includes('liverpool')) return UK_AREA_COORDS['Liverpool'];
  if (lower.includes('bristol')) return UK_AREA_COORDS['Bristol'];
  if (lower.includes('sheffield')) return UK_AREA_COORDS['Sheffield'];
  if (lower.includes('newcastle')) return UK_AREA_COORDS['Newcastle'];
  if (lower.includes('nottingham')) return UK_AREA_COORDS['Nottingham'];
  if (lower.includes('southampton')) return UK_AREA_COORDS['Southampton'];
  if (lower.includes('reading')) return UK_AREA_COORDS['Reading'];
  if (lower.includes('brighton')) return UK_AREA_COORDS['Brighton'];
  if (lower.includes('oxford')) return UK_AREA_COORDS['Oxford'];
  if (lower.includes('cambridge')) return UK_AREA_COORDS['Cambridge'];
  if (lower.includes('cardiff')) return UK_AREA_COORDS['Cardiff'];
  if (lower.includes('edinburgh')) return UK_AREA_COORDS['Edinburgh'];
  if (lower.includes('glasgow')) return UK_AREA_COORDS['Glasgow'];
  if (lower.includes('belfast')) return UK_AREA_COORDS['Belfast'];
  if (lower.includes('croydon')) return UK_AREA_COORDS['Croydon'];
  if (lower.includes('slough')) return UK_AREA_COORDS['Slough'];
  if (lower.includes('luton')) return UK_AREA_COORDS['Luton'];
  if (lower.includes('milton keynes')) return UK_AREA_COORDS['Milton Keynes'];
  if (lower.includes('northampton')) return UK_AREA_COORDS['Northampton'];
  if (lower.includes('leicester')) return UK_AREA_COORDS['Leicester'];
  if (lower.includes('coventry')) return UK_AREA_COORDS['Coventry'];
  if (lower.includes('wolverhampton')) return UK_AREA_COORDS['Wolverhampton'];
  if (lower.includes('lingfield') || lower.startsWith('rh7')) {
    return UK_AREA_COORDS['RH7 6AA'];
  }
  if (UK_POSTCODE_REGEX.test(trimmed)) {
    const n = normalizeUkPostcode(trimmed);
    if (n && UK_AREA_COORDS[n]) return UK_AREA_COORDS[n];
    return UK_DEFAULT_COORDS;
  }
  return null;
}

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
 * Get address/place suggestions as user types.
 * @param {string} input - search text
 * @param {{ region: 'uk'|'bd' }} [options] - 'uk' for UK/England (default), 'bd' for Bangladesh
 * Order: (1) Local areas list (UK or BD), (2) New Places API, (3) Legacy Autocomplete, (4) Geocoding.
 */
export async function getPlaceSuggestions(input, options = {}) {
  if (!input || !String(input).trim()) return [];
  const trimmed = String(input).trim();
  const lower = trimmed.toLowerCase();
  const region = options.region || 'uk';
  const isUK = region === 'uk';

  // 1) Local areas – UK or BD
  const localAreas = isUK ? UK_AREAS : BD_AREAS;
  const localMatches = localAreas.filter(area => area.toLowerCase().includes(lower));
  if (localMatches.length > 0) {
    return localMatches.map(description => ({ description, place_id: '' }));
  }

  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (!key || !key.trim()) return [];

    // 2) New Places API (v1) – biased to UK or BD
    const newSuggestions = await getPlaceSuggestionsNewApi(key, trimmed, {
      region,
      center: isUK ? UK_DEFAULT_COORDS : { lat: 23.8103, lng: 90.4125 },
    });
    if (newSuggestions.length > 0) return newSuggestions;

    // 3) Legacy Place Autocomplete
    const legacyRegion = isUK ? 'gb' : 'bd';
    const encoded = encodeURIComponent(trimmed);
    const legacyUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encoded}&key=${key}&region=${legacyRegion}`;
    const legacyRes = await fetch(legacyUrl);
    const legacyData = await legacyRes.json();
    const predictions = (legacyData?.predictions || []).map(p => ({
      description: p.description || '',
      place_id: p.place_id || '',
    })).filter(p => p.description && p.place_id);
    if (predictions.length > 0) return predictions;

    // 4) Geocoding – one suggestion (with country hint for UK)
    let fallback = await geocodeAddressWithFormatted(trimmed, isUK ? 'gb' : null);
    if (!fallback && isUK) fallback = await geocodeAddressWithFormatted(trimmed + ', United Kingdom', 'gb');
    if (fallback) return [fallback];
    return [];
  } catch (e) {
    let fallback = await geocodeAddressWithFormatted(trimmed, isUK ? 'gb' : null);
    if (!fallback && isUK) fallback = await geocodeAddressWithFormatted(trimmed + ', United Kingdom', 'gb');
    if (fallback) return [fallback];
    return [];
  }
}

/**
 * New Places API (v1) autocomplete – POST, returns place predictions.
 * @param {string} key - Google API key
 * @param {string} input - search text
 * @param {{ region: 'uk'|'bd', center: { lat: number, lng: number } }} [options] - region and map center for bias
 */
async function getPlaceSuggestionsNewApi(key, input, options = {}) {
  const region = options.region || 'uk';
  const isUK = region === 'uk';
  const center = options.center || (isUK ? UK_DEFAULT_COORDS : { lat: 23.8103, lng: 90.4125 });
  const regionCodes = isUK ? ['gb'] : ['bd'];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: regionCodes,
        locationBias: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
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
 * @param {string} address - address to geocode
 * @param {string|null} [region] - optional region code e.g. 'gb' for UK
 * @returns {Promise<{ description: string, place_id: string } | null>}
 */
async function geocodeAddressWithFormatted(address, region = null) {
  if (!address || !String(address).trim()) return null;
  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (!key || !key.trim()) return null;
    const encoded = encodeURIComponent(String(address).trim());
    const regionParam = region ? `&region=${region}` : '';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${key}${regionParam}`;
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
