import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import { phoneLogin } from './authService';

let confirmationResult = null;
let recaptchaFlowReady = false;

/**
 * Play Store builds use Google's App Signing key. When Play Integrity rejects
 * the package/SHA-256 pair, Firebase throws auth/app-not-authorized.
 * Force the reCAPTCHA verification path on Android so phone OTP still works.
 */
function ensureAndroidPhoneVerificationFlow() {
  if (Platform.OS !== 'android' || recaptchaFlowReady) return;
  try {
    auth().settings.forceRecaptchaFlowForTesting = true;
    recaptchaFlowReady = true;
  } catch (e) {
    console.warn('forceRecaptchaFlowForTesting unavailable', e);
  }
}

export function normalizeUkPhoneInput(value) {
  const raw = String(value || '').trim().replace(/\s/g, '');
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('00')) return `+${raw.slice(2)}`;
  if (raw.startsWith('0')) return `+44${raw.slice(1)}`;
  return `+${raw}`;
}

export async function sendPhoneOtp(phoneInput) {
  const phone = normalizeUkPhoneInput(phoneInput);
  if (!phone || phone.length < 10) {
    throw new Error('Enter a valid mobile number');
  }
  ensureAndroidPhoneVerificationFlow();
  confirmationResult = await auth().signInWithPhoneNumber(phone);
  return { phone };
}

export async function confirmPhoneOtp(code) {
  if (!confirmationResult) {
    throw new Error('Request a verification code first');
  }
  const credential = await confirmationResult.confirm(String(code || '').trim());
  const idToken = await credential.user.getIdToken();
  const phone = credential.user.phoneNumber;
  const data = await phoneLogin({
    idToken,
    phone,
    termsAccepted: true,
  });
  confirmationResult = null;
  return data;
}
