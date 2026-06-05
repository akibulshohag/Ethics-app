#!/usr/bin/env bash
# Prints SHA-1 / Facebook key hashes for Meta & Google Cloud consoles.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/android/app"

echo "=== Eatix Android signing keys ==="
echo "Package name: com.eatix.app"
echo ""

print_keystore() {
  local label="$1"
  local keystore="$2"
  local alias="$3"
  local storepass="$4"
  local keypass="${5:-$storepass}"

  if [[ ! -f "$keystore" ]]; then
    echo "[$label] Keystore not found: $keystore"
    return
  fi

  echo "---------- $label ----------"
  echo "Keystore: $keystore"
  echo "Alias: $alias"
  keytool -list -v -keystore "$keystore" -alias "$alias" -storepass "$storepass" -keypass "$keypass" 2>/dev/null \
    | grep -E "SHA1:|SHA256:" || echo "(wrong password or alias)"
  echo "Facebook key hash:"
  keytool -exportcert -alias "$alias" -keystore "$keystore" -storepass "$storepass" -keypass "$keypass" 2>/dev/null \
    | openssl sha1 -binary | openssl base64 || echo "(could not export — check password)"
  echo ""
}

print_keystore "DEBUG (local dev / default release if upload password empty)" \
  "$APP_DIR/debug.keystore" "androiddebugkey" "android" "android"

if [[ -f "$APP_DIR/my-upload-key.keystore" ]]; then
  STORE_PASS="${MYAPP_UPLOAD_STORE_PASSWORD:-}"
  KEY_PASS="${MYAPP_UPLOAD_KEY_PASSWORD:-$STORE_PASS}"
  if [[ -z "$STORE_PASS" ]]; then
    echo "---------- RELEASE (my-upload-key.keystore) ----------"
    echo "Set passwords then re-run:"
    echo "  MYAPP_UPLOAD_STORE_PASSWORD='***' MYAPP_UPLOAD_KEY_PASSWORD='***' $0"
    echo "Or add to android/gradle.properties:"
    echo "  MYAPP_UPLOAD_STORE_PASSWORD=..."
    echo "  MYAPP_UPLOAD_KEY_PASSWORD=..."
    echo ""
  else
    print_keystore "RELEASE (Play Store / signed APK)" \
      "$APP_DIR/my-upload-key.keystore" "my-key-alias" "$STORE_PASS" "$KEY_PASS"
  fi
fi

echo "=== Where to paste these ==="
echo "Facebook: https://developers.facebook.com/apps/1714809253015158/settings/basic/"
echo "  → Android → Key hashes (add EVERY hash from above + from logcat on device)"
echo ""
echo "Google: https://console.cloud.google.com/apis/credentials (project 366684605140)"
echo "  → Create OAuth client → Android → package com.eatix.app + SHA-1"
echo "  → Firebase: Project settings → Your apps → Add SHA-1 if using Firebase"
echo ""
echo "Installed APK (most accurate for the build on your phone):"
echo "  adb logcat -s EatixSigningKeys"
