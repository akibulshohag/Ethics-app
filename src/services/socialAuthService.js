import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AccessToken, LoginManager, Settings } from 'react-native-fbsdk-next';
import { config } from '../../config';
import { socialLogin } from './authService';

let googleConfigured = false;

const readGoogleIdToken = payload =>
  payload?.idToken || payload?.data?.idToken || payload?.user?.idToken || null;

function ensureGoogleConfigured() {
  if (googleConfigured) return;
  const webClientId = String(config.googleClientId || '').trim();
  if (!webClientId) {
    throw new Error(
      'Google sign-in is not configured. Set `googleClientId` in Ethics-app/config.js.',
    );
  }
  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export async function loginWithGoogle() {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const payload = await GoogleSignin.signIn();
  const idToken = readGoogleIdToken(payload);
  if (!idToken) {
    throw new Error('Google did not return an id token');
  }
  return socialLogin({ provider: 'google', idToken });
}

export async function loginWithFacebook() {
  const appId = String(config.facebookAppId || '').trim();
  const clientToken = String(config.facebookClientToken || '').trim();
  if (!appId) {
    throw new Error(
      'Facebook sign-in is not configured. Set `facebookAppId` in Ethics-app/config.js.',
    );
  }
  if (!clientToken) {
    throw new Error(
      'Facebook sign-in is not configured. Set `facebookClientToken` in Ethics-app/config.js and android/app/src/main/res/values/strings.xml.',
    );
  }
  Settings.setAppID(appId);
  Settings.setClientToken(clientToken);
  Settings.initializeSDK();
  LoginManager.setLoginBehavior('native_with_fallback');

  const result = await LoginManager.logInWithPermissions([
    'public_profile',
    'email',
  ]);
  if (result?.isCancelled) {
    throw new Error('Facebook login was cancelled');
  }

  const token = await AccessToken.getCurrentAccessToken();
  const accessToken = token?.accessToken?.toString?.() || token?.accessToken;
  if (!accessToken) {
    throw new Error('Facebook did not return an access token');
  }
  return socialLogin({ provider: 'facebook', accessToken });
}

export function normalizeSocialAuthError(error) {
  const code = String(error?.code || '');
  if (
    code === statusCodes.SIGN_IN_CANCELLED ||
    /cancelled|canceled/i.test(String(error?.message || ''))
  ) {
    return 'Sign-in cancelled';
  }
  if (code === statusCodes.IN_PROGRESS) {
    return 'Another sign-in request is already in progress.';
  }
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services is not available or outdated.';
  }
  return String(error?.message || 'Social sign-in failed');
}
