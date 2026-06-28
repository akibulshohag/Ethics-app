import googleServices from './android/app/google-services.json';
import fs from 'fs';
import path from 'path';

/** Firebase eatix-17d2a — must match backend GOOGLE_CLIENT_ID and strings.xml default_web_client_id. */
export const EATIX_GOOGLE_WEB_CLIENT_ID =
  '236298500212-810ubvv2taqs55m35pgvg0h795so6u68.apps.googleusercontent.com';

export const EATIX_GOOGLE_ANDROID_CLIENT_ID =
  '236298500212-hvgs9mkvoio5dnel4uo730if45ap3ipi.apps.googleusercontent.com';

const IOS_GOOGLE_PLIST_PATH = path.join(
  __dirname,
  'ios',
  'Ethics',
  'GoogleService-Info.plist',
);

function readIosGooglePlistField(key) {
  try {
    if (!fs.existsSync(IOS_GOOGLE_PLIST_PATH)) return '';
    const xml = fs.readFileSync(IOS_GOOGLE_PLIST_PATH, 'utf8');
    const match = xml.match(
      new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`),
    );
    return match ? String(match[1]).trim() : '';
  } catch {
    return '';
  }
}

/** iOS OAuth client from Firebase GoogleService-Info.plist (after apply-ios-google-service-info.js). */
export function resolveGoogleIosClientId() {
  return readIosGooglePlistField('CLIENT_ID');
}

export function resolveGoogleIosReversedClientId() {
  return readIosGooglePlistField('REVERSED_CLIENT_ID');
}

/** Web OAuth client from Firebase google-services.json (client_type 3). */
export function resolveGoogleWebClientId() {
  const client = googleServices?.client?.[0];
  const oauth = client?.oauth_client || [];
  const fromOauth = oauth.find(c => Number(c.client_type) === 3);
  if (fromOauth?.client_id) {
    return String(fromOauth.client_id).trim();
  }
  const other =
    client?.services?.appinvite_service?.other_platform_oauth_client || [];
  const fromOther = other.find(c => Number(c.client_type) === 3);
  if (fromOther?.client_id) {
    return String(fromOther.client_id).trim();
  }
  return EATIX_GOOGLE_WEB_CLIENT_ID;
}

export function getFirebaseProjectNumber() {
  return String(googleServices?.project_info?.project_number || '').trim();
}

export function googleServicesHasOAuthClients() {
  const oauth = googleServices?.client?.[0]?.oauth_client || [];
  return oauth.length > 0;
}
