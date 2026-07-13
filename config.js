import { Platform } from 'react-native';
import {
  EATWAZE_GOOGLE_WEB_CLIENT_ID,
  getFirebaseProjectNumber,
  googleServicesHasOAuthClients,
  resolveGoogleWebClientId,
} from './googleAuthConfig';

export const APP_NAME = 'Eatwaze';
export const TEL_NUMBER = '018********';

// Override for physical device: use your computer's LAN IP (e.g. 192.168.1.x:3000)
const LOCAL_OVERRIDE = null; // e.g. 'http://192.168.1.100:3000/v1'

const checkConfig = server => {
  let config = {};
  switch (server) {
    case 'production':
      config = {
        apiBaseUrl: 'https://eatixapi.pino7.com/v1',
      };
      break;
    case 'staging':
      config = {
        apiBaseUrl: 'https://ss.example.com/api',
      };
      break;
    case 'local':
      if (LOCAL_OVERRIDE) {
        config = { apiBaseUrl: LOCAL_OVERRIDE };
      } else {
        // Android emulator: 10.0.2.2 = host machine
        // iOS simulator: localhost works
        const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
        config = {
          apiBaseUrl: `http://${host}:3000/v1`,
        };
      }
      break;
    default:
      break;
  }
  return config;
};

export const selectServer = 'production';

export const config = {
  ...checkConfig(selectServer),
  googleMapsApiKey: 'AIzaSyDdAoHeCNbd81rqwMApCne-bB5qYVwCaqk',
  /**
   * Business Meta app — page verify, Instagram, scheduled auto-post.
   * Must match server `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` on eatixapi.
   * Do NOT use this for the consumer "Login with Facebook" button.
   */
  facebookAppId: '1714809253015158',
  facebookClientToken: '17658cbb4f5031595adeb84c3f084ab5',
  /**
   * Consumer login only — separate Meta app (Eatwaze Login).
   * Used by Login with Facebook + native SDK (Android strings.xml, iOS Info.plist).
   */
  facebookLoginAppId: '1020637567080925',
  facebookLoginClientToken: '2490cd089fef0f717b9237884f858cc7',
  /** iOS bundle ID for Sign in with Apple — must match Xcode + Apple Developer. */
  appleBundleId: 'com.eatwaze.app',
  /**
   * Leave EMPTY to use standard consumer Facebook Login (public_profile + email),
   * which has Advanced Access by default — no Business Verification / App Review.
   * Only set a Configuration ID if you intentionally switch to Facebook Login
   * for Business (Meta → Facebook Login for Business → Configurations).
   */
  facebookLoginConfigId: '',
  /**
   * Must match server `FACEBOOK_ENABLE_INSTAGRAM_LOGIN`. Set true when Meta OAuth works.
   */
  facebookIncludeInstagramScopes: false,
  /**
   * Must match server `FACEBOOK_INSTAGRAM_LOGIN_SCOPES` (comma-separated, no spaces).
   * Leave empty to use default instagram_basic,instagram_content_publish.
   * If Meta only allows business names: instagram_business_basic,instagram_business_content_publish
   */
  facebookInstagramLoginScopes: '',
  /** Same as backend `TIKTOK_CLIENT_KEY` — optional fallback to build TikTok login URL locally. */
  tiktokClientKey: '',
  /**
   * Google Sign-In Web client ID — read from android/app/google-services.json when present.
   * Firebase project: eatix-17d2a (236298500212). If empty, finish Firebase setup below.
   */
  googleClientId: resolveGoogleWebClientId() || EATWAZE_GOOGLE_WEB_CLIENT_ID,
  firebaseProjectNumber: getFirebaseProjectNumber(),
  firebaseProjectId: 'eatix-17d2a',
  firebaseWebApiKey: 'AIzaSyDfm-dg0mREdAOTmrcPzt5dXZ0kpuMGUb0',
};

/**
 * Must match backend `APP_URL` + `/social-auth/facebook/callback`.
 * Add this exact string in Meta: App → Facebook Login → Settings → Valid OAuth Redirect URIs.
 */
export const facebookOAuthRedirectUri = () => {
  const base = String(config.apiBaseUrl || '').replace(/\/$/, '');
  return `${base}/social-auth/facebook/callback`;
};

/**
 * Add in TikTok Developer Portal → your app → URL properties → Redirect URI / Web desktop.
 * Must match backend `APP_URL` + `/social-auth/tiktok/callback`.
 */
export const tiktokOAuthRedirectUri = () => {
  const base = String(config.apiBaseUrl || '').replace(/\/$/, '');
  return `${base}/social-auth/tiktok/callback`;
};

/**
 * Add in Google Cloud Console → APIs & Services → Credentials → your OAuth Web client
 * → Authorized redirect URIs. Must match backend `APP_URL` + `/social-auth/youtube/callback`.
 */
export const youtubeOAuthRedirectUri = () => {
  const base = String(config.apiBaseUrl || '').replace(/\/$/, '');
  return `${base}/social-auth/youtube/callback`;
};
