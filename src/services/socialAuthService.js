import { Linking } from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { AccessToken, LoginManager, Settings } from 'react-native-fbsdk-next';
import { config } from '../../config';
import { EATIX_GOOGLE_WEB_CLIENT_ID } from '../../googleAuthConfig';
import { socialLogin } from './authService';

let googleConfigured = false;

const readGoogleIdToken = payload =>
  payload?.idToken || payload?.data?.idToken || payload?.user?.idToken || null;

function ensureGoogleConfigured() {
  if (googleConfigured) return;
  const webClientId = String(
    config.googleClientId || EATIX_GOOGLE_WEB_CLIENT_ID,
  ).trim();
  if (!webClientId) {
    const proj = config.firebaseProjectNumber || 'eatix-17d2a';
    throw new Error(
      `Google Sign-In is not configured. In Firebase (${proj}): Project settings → ` +
        `Android app com.eatix.app → add SHA-1 B8:C2:D3:45:... (release) and 5E:8F:16:06:... (debug). ` +
        `Enable Authentication → Google. Re-download google-services.json, rebuild APK.`,
    );
  }
  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
    scopes: ['email', 'profile'],
  });
  googleConfigured = true;
}

export async function loginWithGoogle() {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  try {
    await GoogleSignin.signOut();
  } catch (_) {
    // ignore — clears stale account picker state
  }
  const signInResult = await GoogleSignin.signIn();
  if (!isSuccessResponse(signInResult)) {
    throw new Error('Google login was cancelled');
  }

  let idToken = readGoogleIdToken(signInResult);
  let accessToken = null;
  try {
    const tokens = await GoogleSignin.getTokens();
    idToken = idToken || tokens?.idToken || null;
    accessToken = tokens?.accessToken || null;
  } catch (_) {
    // getTokens may fail before first sign-in; sign-in payload is enough
  }

  if (!idToken && !accessToken) {
    throw new Error(
      'Google did not return a sign-in token. Rebuild the APK after Firebase (eatix-17d2a) has your release SHA-1 on com.eatix.app.',
    );
  }
  return socialLogin({
    provider: 'google',
    ...(idToken ? { idToken } : {}),
    ...(accessToken ? { accessToken } : {}),
  });
}

function parseFacebookRedirectUrl(url) {
  const raw = String(url || '');
  if (!raw) return null;
  const fragment = raw.includes('#') ? raw.split('#')[1] : raw.split('?')[1];
  if (!fragment) return null;
  const params = new URLSearchParams(fragment);
  const error = params.get('error');
  if (error) {
    throw new Error(
      params.get('error_description') ||
        params.get('error_message') ||
        error,
    );
  }
  return params.get('access_token');
}

/**
 * Facebook Login for Business requires a Configuration ID from Meta Console.
 * Standard scope-only login fails with "needs at least one supported permission".
 */
async function loginWithFacebookBusinessConfig(configId) {
  const appId = String(config.facebookLoginAppId || '').trim();
  const redirectUri = `fb${appId}://authorize`;
  const authUrl =
    `https://www.facebook.com/v21.0/dialog/oauth?` +
    `client_id=${encodeURIComponent(appId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `config_id=${encodeURIComponent(configId)}&` +
    `response_type=token`;

  return new Promise((resolve, reject) => {
    let settled = false;
    let subscription = null;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      fn(value);
    };

    const handleUrl = ({ url }) => {
      const raw = String(url || '');
      if (!raw.includes('authorize')) return;
      try {
        const accessToken = parseFacebookRedirectUrl(raw);
        if (!accessToken) {
          finish(reject, new Error('Facebook did not return an access token'));
          return;
        }
        socialLogin({ provider: 'facebook', accessToken })
          .then(data => finish(resolve, data))
          .catch(err => finish(reject, err));
      } catch (err) {
        finish(reject, err);
      }
    };

    subscription = Linking.addEventListener('url', handleUrl);
    const timer = setTimeout(
      () => finish(reject, new Error('Facebook login timed out. Try again.')),
      120000,
    );

    Linking.getInitialURL()
      .then(initial => {
        if (initial) handleUrl({ url: initial });
      })
      .catch(() => {});

    Linking.openURL(authUrl).catch(err => finish(reject, err));
  });
}

async function loginWithFacebookSdkPermissions(requestedPermissions) {
  LoginManager.setLoginBehavior('native_with_fallback');
  const fbPermissions =
    requestedPermissions?.length > 0
      ? requestedPermissions
      : ['public_profile'];
  const result = await LoginManager.logInWithPermissions(fbPermissions);
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

export async function loginWithFacebook() {
  const appId = String(config.facebookLoginAppId || '').trim();
  const clientToken = String(config.facebookLoginClientToken || '').trim();
  const configId = String(config.facebookLoginConfigId || '').trim();

  if (!appId) {
    throw new Error(
      'Facebook sign-in is not configured. Set `facebookLoginAppId` in Ethics-app/config.js.',
    );
  }
  if (!clientToken) {
    throw new Error(
      'Facebook sign-in is not configured. Set `facebookLoginClientToken` in Ethics-app/config.js and android/app/src/main/res/values/strings.xml.',
    );
  }
  Settings.setAppID(appId);
  Settings.setClientToken(clientToken);
  Settings.initializeSDK();

  if (configId) {
    return loginWithFacebookBusinessConfig(configId);
  }

  try {
    // New Meta login apps often lack `email` in Use cases → Permissions until you add it.
    // public_profile alone is enough; API uses fb_{id}@facebook.eatix.app when email is missing.
    return await loginWithFacebookSdkPermissions(['public_profile']);
  } catch (permErr) {
    const permMsg = String(permErr?.message || permErr || '');
    if (
      /supported permission|isn't available|is not available|invalid scopes/i.test(
        permMsg,
      )
    ) {
      throw new Error(
        'Facebook Login for Business needs a Configuration ID. In Meta Console (app ' +
          appId +
          '): Facebook Login for Business → Configurations → Create configuration ' +
          '(add public_profile + pages_show_list) → copy Configuration ID → set facebookLoginConfigId in Ethics-app/config.js → rebuild APK.',
      );
    }
    throw permErr;
  }
}

const YOUTUBE_VERIFY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

export const YOUTUBE_VERIFY_SCOPES = YOUTUBE_VERIFY_SCOPE;

function normalizeYouTubeConnectError(error) {
  const msg = String(error?.message || error || '');
  if (
    /access_denied|403|verification process|developer-approved testers|test users/i.test(
      msg,
    )
  ) {
    return (
      'Google blocked YouTube access because the Eatwaze OAuth app is still in Testing mode. ' +
      'Add your Gmail under Google Cloud Console → OAuth consent screen → Test users, then try again. ' +
      'For all users without adding test accounts, publish the app and complete Google verification.'
    );
  }
  return normalizeSocialAuthError(error);
}

export async function connectYouTubeWithGoogleSignIn(userId) {
  const uid = String(userId || '').trim();
  if (!uid) {
    throw new Error('Sign in required to connect YouTube.');
  }
  const webClientId = String(
    config.googleClientId || EATIX_GOOGLE_WEB_CLIENT_ID,
  ).trim();
  if (!webClientId) {
    throw new Error(
      'Google Sign-In is not configured. Re-download google-services.json and rebuild the app.',
    );
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
    scopes: [YOUTUBE_VERIFY_SCOPE],
  });

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  let signInResult;
  try {
    const signedIn = await GoogleSignin.hasPreviousSignIn();
    if (signedIn) {
      try {
        signInResult = await GoogleSignin.addScopes({
          scopes: [YOUTUBE_VERIFY_SCOPE],
        });
      } catch (_) {
        await GoogleSignin.signOut().catch(() => {});
        signInResult = await GoogleSignin.signIn();
      }
    } else {
      signInResult = await GoogleSignin.signIn();
    }
  } catch (error) {
    throw new Error(normalizeYouTubeConnectError(error));
  }

  if (!isSuccessResponse(signInResult)) {
    throw new Error('YouTube connect was cancelled');
  }

  const serverAuthCode =
    signInResult?.data?.serverAuthCode || signInResult?.serverAuthCode || '';
  if (!serverAuthCode) {
    throw new Error(
      'Google did not return an auth code. Rebuild the app after Firebase Web client + SHA-1 are configured.',
    );
  }

  const { request } = require('./api');
  try {
    return await request({
      endpoint: 'social-auth/youtube/connect-mobile',
      method: 'POST',
      body: {
        userId: uid,
        serverAuthCode,
        mode: 'verify',
      },
    });
  } catch (error) {
    const data = error?.response?.data;
    const backendMsg = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message || data?.error;
    throw new Error(
      String(backendMsg || error?.message || 'YouTube connect failed'),
    );
  }
}

export function normalizeSocialAuthError(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  if (
    code === statusCodes.SIGN_IN_CANCELLED ||
    /cancelled|canceled/i.test(msg)
  ) {
    return 'Sign-in cancelled';
  }
  if (code === statusCodes.IN_PROGRESS) {
    return 'Another sign-in request is already in progress.';
  }
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services is not available or outdated.';
  }
  if (/Invalid Scopes:\s*email/i.test(msg)) {
    return (
      'Facebook app does not have the email permission enabled. Rebuild the latest APK (uses public_profile only) ' +
      'or in Meta Console add email under Use cases → Authenticate with Facebook Login → Permissions.'
    );
  }
  if (
    /supported permission|isn't available|is not available|Configuration ID|facebookLoginConfigId/i.test(
      msg,
    )
  ) {
    return msg;
  }
  if (/supported permission|Invalid Scopes|invalid scopes/i.test(msg)) {
    return (
      'Facebook Login permissions are not enabled for this Meta app. Open developers.facebook.com → your app → ' +
      'Facebook Login for Business → Configurations → create one with public_profile + pages_show_list.'
    );
  }
  if (/Social login is not available on this server/i.test(msg)) {
    return msg;
  }
  if (/Google profile is incomplete/i.test(msg)) {
    return msg;
  }
  if (/Invalid Google token/i.test(msg)) {
    return msg;
  }
  if (/Google token audience mismatch/i.test(msg)) {
    return (
      'API server needs update: SSH to eatixapi, run cd /var/www/eatix-backend && git pull && ./deploy-api-update.sh — then try Google login again.'
    );
  }
  if (/DEVELOPER_ERROR/i.test(msg) || code === '10') {
    if (!config.googleClientId) {
      return (
        'Firebase google-services.json has no Web OAuth client. Add SHA-1 fingerprints in Firebase ' +
        '(eatix-17d2a), enable Authentication → Google, re-download google-services.json, rebuild APK.'
      );
    }
    return (
      'Google Sign-In config mismatch. Use Firebase project eatix-17d2a only: add release SHA-1 ' +
      'B8:C2:D3:45:EF:A9:E4:10:86:6E:E5:BD:46:D2:C9:59:5F:F0:3F:82 on Android app com.eatix.app, ' +
      're-download google-services.json, update backend GOOGLE_CLIENT_ID to the same Web client, rebuild.'
    );
  }
  if (/key hash|key hashes/i.test(msg)) {
    return (
      'Facebook needs your APK key hash in Meta Developer Console. Install the APK, run ' +
      'adb logcat -s EatwazeSigningKeys, copy the Facebook Key hash, and add it under your Meta app Android settings.'
    );
  }
  return msg || 'Social sign-in failed';
}
