#!/usr/bin/env bash
# Print SHA-1 of an installed Eatix APK or a local .apk file.
# Usage:
#   ./scripts/verify-apk-sha1.sh path/to/app-release.apk
#   ./scripts/verify-apk-sha1.sh   # reads installed com.eatix.app from device
set -euo pipefail

PKG=com.eatix.app
RELEASE_EXPECT="B8:C2:D3:45:EF:A9:E4:10:86:6E:E5:BD:46:D2:C9:59:5F:F0:3F:82"
DEBUG_EXPECT="5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25"

if [[ -n "${1:-}" && -f "$1" ]]; then
  echo "APK file: $1"
  unzip -p "$1" META-INF/*.RSA META-INF/*.DSA META-INF/*.EC 2>/dev/null | keytool -printcert 2>/dev/null | grep "SHA1:" || \
    keytool -printcert -jarfile "$1" 2>/dev/null | grep "SHA1:"
else
  echo "Installed package: $PKG (via adb)"
  adb shell pm path "$PKG" | head -1 | sed 's/package://' | while read -r apk; do
    adb pull "$apk" /tmp/eatix-check.apk >/dev/null
    keytool -printcert -jarfile /tmp/eatix-check.apk | grep "SHA1:"
  done
fi

echo ""
echo "Expected release SHA-1: $RELEASE_EXPECT"
echo "Expected debug SHA-1:   $DEBUG_EXPECT"
echo "Add the matching SHA-1 in Google Cloud → Android OAuth (com.eatix.app)."
