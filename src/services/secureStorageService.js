import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const STORAGE_KEY = '@eatix/biometric_session';
const BIOMETRIC_METHOD_KEY = '@eatix/biometric_preferred_method';
const BIOMETRIC_SERVICE = 'com.eatix.app.biometric';

/** Keep biometric login credentials on device after normal logout. */
export const BIOMETRIC_SESSION_STORAGE_KEY = STORAGE_KEY;

export const ASYNC_STORAGE_KEEP_ON_LOGOUT = [
  STORAGE_KEY,
  BIOMETRIC_METHOD_KEY,
  'USER_LOCATION_SELECTION',
  '@ethics_dark_mode',
];

/** Store session after user passes biometric prompt (no Keychain biometry flag — avoids Android crashes). */
export async function saveBiometricSession({ userId, token }) {
  const payload = JSON.stringify({
    userId: String(userId || ''),
    token: String(token || ''),
    savedAt: Date.now(),
  });
  await AsyncStorage.setItem(STORAGE_KEY, payload);
  try {
    await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
  } catch {
    // ignore legacy cleanup errors
  }
}

export async function getBiometricSession() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearBiometricSession() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  try {
    await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
  } catch {
    // ignore
  }
}

export async function hasBiometricSession() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return !!raw;
}

export async function saveBiometricPreferredMethod(method) {
  if (!method) {
    await AsyncStorage.removeItem(BIOMETRIC_METHOD_KEY);
    return;
  }
  await AsyncStorage.setItem(BIOMETRIC_METHOD_KEY, String(method));
}

export async function getBiometricPreferredMethod() {
  const value = await AsyncStorage.getItem(BIOMETRIC_METHOD_KEY);
  if (value === 'face' || value === 'fingerprint' || value === 'any') {
    return value;
  }
  return null;
}
