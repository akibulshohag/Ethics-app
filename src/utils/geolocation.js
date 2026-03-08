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
export async function geocodeAddress(address) {
  if (!address || !String(address).trim()) return null;
  try {
    const { config } = require('../../config');
    const key = config?.googleMapsApiKey;
    if (!key || !key.trim()) return null;
    const encoded = encodeURIComponent(String(address).trim());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${key}`;
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
