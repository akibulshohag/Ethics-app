import { request } from './api';

/**
 * Save user's last selected location to backend (used after login on any device).
 * Requires user to be logged in (token in store).
 */
export async function saveLastLocationToBackend({ lat, lng, addressText = '' }) {
  if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return;
  }
  try {
    await request({
      endpoint: 'users/saved-last-location',
      method: 'PATCH',
      body: { lat: Number(lat), lng: Number(lng), addressText: String(addressText || '').trim() },
    });
  } catch (e) {
    // non-blocking; app still works with local AsyncStorage
  }
}
