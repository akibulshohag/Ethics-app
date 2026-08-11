#!/usr/bin/env node
/**
 * Copy Firebase GoogleService-Info.plist into the iOS app and sync Google Sign-In URL scheme.
 *
 * Usage:
 *   node scripts/apply-ios-google-service-info.js ~/Downloads/GoogleService-Info.plist
 *
 * Firebase: Project eatix-17d2a → Add iOS app → Bundle ID com.eatwaze.food → download plist.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_PLIST = path.join(ROOT, 'ios/Ethics/GoogleService-Info.plist');
const INFO_PLIST = path.join(ROOT, 'ios/Ethics/Info.plist');
const GOOGLE_AUTH_CONFIG = path.join(ROOT, 'googleAuthConfig.js');
const EXPECTED_BUNDLE_ID = 'com.eatwaze.food';

function readPlistValues(xml) {
  const pick = key => {
    const m = xml.match(
      new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`),
    );
    return m ? String(m[1]).trim() : '';
  };
  return {
    clientId: pick('CLIENT_ID'),
    reversedClientId: pick('REVERSED_CLIENT_ID'),
    bundleId: pick('BUNDLE_ID'),
  };
}

function upsertGoogleUrlScheme(infoXml, reversedClientId) {
  if (!reversedClientId) {
    throw new Error('REVERSED_CLIENT_ID missing in GoogleService-Info.plist');
  }
  if (infoXml.includes(`<string>${reversedClientId}</string>`)) {
    return infoXml;
  }

  const googleSignInBlock =
    /(<key>CFBundleURLName<\/key>\s*<string>google-signin<\/string>\s*<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>)[^<]+(<\/string>)/;
  if (googleSignInBlock.test(infoXml)) {
    return infoXml.replace(
      googleSignInBlock,
      `$1${reversedClientId}$2`,
    );
  }

  const googleBlock = `\t\t<dict>
\t\t\t<key>CFBundleURLName</key>
\t\t\t<string>google-signin</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${reversedClientId}</string>
\t\t\t</array>
\t\t</dict>
`;

  const markers = [
    '\t</array>\n\t<key>CFBundleVersion</key>',
    '\t</array>\n\t<key>FacebookAppID</key>',
  ];
  for (const marker of markers) {
    if (infoXml.includes(marker)) {
      return infoXml.replace(marker, `${googleBlock}${marker}`);
    }
  }

  throw new Error(
    'Could not find CFBundleURLTypes block in Info.plist (expected CFBundleVersion or FacebookAppID after URL types)',
  );
}

function upsertGoogleAuthConfigIosIds(clientId, reversedClientId) {
  let configJs = fs.readFileSync(GOOGLE_AUTH_CONFIG, 'utf8');
  configJs = configJs.replace(
    /export const EATWAZE_GOOGLE_IOS_CLIENT_ID =\s*\n\s*'[^']*';/,
    `export const EATWAZE_GOOGLE_IOS_CLIENT_ID =\n  '${clientId}';`,
  );
  configJs = configJs.replace(
    /export const EATWAZE_GOOGLE_IOS_REVERSED_CLIENT_ID =\s*\n\s*'[^']*';/,
    `export const EATWAZE_GOOGLE_IOS_REVERSED_CLIENT_ID =\n  '${reversedClientId}';`,
  );
  fs.writeFileSync(GOOGLE_AUTH_CONFIG, configJs);
}

function main() {
  const source = process.argv[2];
  if (!source) {
    console.error(
      'Usage: node scripts/apply-ios-google-service-info.js /path/to/GoogleService-Info.plist',
    );
    process.exit(1);
  }

  const resolved = path.resolve(source);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(resolved, 'utf8');
  const values = readPlistValues(xml);
  if (!values.clientId) {
    console.error('Invalid plist: CLIENT_ID not found');
    process.exit(1);
  }
  if (values.bundleId && values.bundleId !== EXPECTED_BUNDLE_ID) {
    console.warn(
      `Warning: plist BUNDLE_ID is "${values.bundleId}" (expected ${EXPECTED_BUNDLE_ID})`,
    );
  }

  fs.mkdirSync(path.dirname(TARGET_PLIST), { recursive: true });
  fs.copyFileSync(resolved, TARGET_PLIST);

  let infoXml = fs.readFileSync(INFO_PLIST, 'utf8');
  infoXml = upsertGoogleUrlScheme(infoXml, values.reversedClientId);
  fs.writeFileSync(INFO_PLIST, infoXml);

  upsertGoogleAuthConfigIosIds(values.clientId, values.reversedClientId);

  console.log('Installed GoogleService-Info.plist');
  console.log(`BUNDLE_ID: ${values.bundleId || EXPECTED_BUNDLE_ID}`);
  console.log(`CLIENT_ID: ${values.clientId}`);
  console.log(`REVERSED_CLIENT_ID: ${values.reversedClientId}`);
  console.log('Updated ios/Ethics/Info.plist with Google URL scheme');
  console.log('Updated googleAuthConfig.js iOS client IDs');
  console.log(
    'Next: open Ethics.xcworkspace → confirm GoogleService-Info.plist is in Ethics target → rebuild',
  );
}

main();
