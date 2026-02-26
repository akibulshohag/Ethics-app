/**
 * Safe access to @react-native-community/geolocation.
 * Requests location permission before getting position (Android).
 */
import { Platform, PermissionsAndroid, Linking } from 'react-native';

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
