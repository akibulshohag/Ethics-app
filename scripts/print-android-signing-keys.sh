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

# Prefer passwords from android/keystore.properties (gitignored)
PROPS="$ROOT/android/keystore.properties"
if [[ -f "$PROPS" ]]; then
  # shellcheck disable=SC1090
  set -a
  # Export KEY=VALUE lines only
  while IFS='=' read -r k v; do
    [[ -z "${k:-}" || "$k" =~ ^# ]] && continue
    export "$k=$v"
  done < "$PROPS"
  set +a
fi

STORE_FILE="${MYAPP_UPLOAD_STORE_FILE:-eatwaze-upload.keystore}"
KEY_ALIAS="${MYAPP_UPLOAD_KEY_ALIAS:-eatwaze-upload}"
STORE_PASS="${MYAPP_UPLOAD_STORE_PASSWORD:-}"
KEY_PASS="${MYAPP_UPLOAD_KEY_PASSWORD:-$STORE_PASS}"
RELEASE_KS="$APP_DIR/$STORE_FILE"

if [[ -f "$RELEASE_KS" ]]; then
  if [[ -z "$STORE_PASS" || "$STORE_PASS" == "REPLACE_ME" || "$STORE_PASS" == "your_store_password" ]]; then
    echo "---------- RELEASE ($STORE_FILE) ----------"
    echo "Set real passwords in android/keystore.properties then re-run."
    echo "  MYAPP_UPLOAD_STORE_FILE=$STORE_FILE"
    echo "  MYAPP_UPLOAD_KEY_ALIAS=$KEY_ALIAS"
    echo ""
  else
    print_keystore "RELEASE (Play Store upload key)" \
      "$RELEASE_KS" "$KEY_ALIAS" "$STORE_PASS" "$KEY_PASS"
  fi
else
  echo "[RELEASE] Keystore not found: $RELEASE_KS"
  echo ""
fi

# Legacy keystore (previous releases) — only if still present
if [[ -f "$APP_DIR/my-upload-key.keystore" && "$STORE_FILE" != "my-upload-key.keystore" ]]; then
  echo "---------- LEGACY (my-upload-key.keystore) ----------"
  echo "Present on disk. Only needed if Play Console still expects the old upload key."
  echo ""
fi

echo "=== Upload certificate (public PEM — no password) ==="
PEM="$APP_DIR/upload_certificate.pem"
if [[ -f "$PEM" ]]; then
  openssl x509 -in "$PEM" -fingerprint -sha1 -noout
  openssl x509 -in "$PEM" -fingerprint -sha256 -noout
else
  echo "upload_certificate.pem not found"
fi
echo ""

echo "=== Where to paste these ==="
echo "Play Console → App integrity → Upload key certificate"
echo "  → Use android/app/upload_certificate.pem if registering this upload key"
echo ""
echo "Facebook Login app: https://developers.facebook.com/apps/1020637567080925/settings/basic/"
echo "  → Android → package com.eatix.app + Key hashes"
echo ""
echo "Firebase (eatix-17d2a) → Project settings → Android app com.eatix.app"
echo "  → Add SHA-1 / SHA-256 from RELEASE keystore above"
echo "  → After Play App Signing is on, ALSO add Play Console 'App signing key' SHA-1"
echo ""
echo "Installed APK (most accurate for the build on your phone):"
echo "  adb logcat -s EatixSigningKeys"
