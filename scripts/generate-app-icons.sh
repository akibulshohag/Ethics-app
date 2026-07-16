#!/usr/bin/env bash
# Generate Android + iOS launcher icons from src/assets/icons/logo.png
# Requires macOS `sips`. Run from repo root: Ethics-app/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/src/assets/icons/logo.png"
TMP="${ROOT}/src/assets/icons/.tmp-icon-src.png"

mkdir -p "${ROOT}/src/assets/icons"

if [[ ! -f "$SRC" ]]; then
  echo "No logo at src/assets/icons/logo.png — creating a temporary placeholder (replace with your real 1024×1024 logo)."
  printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > "$TMP"
  sips -z 1024 1024 "$TMP" --out "$SRC" >/dev/null
  rm -f "$TMP"
fi

command -v sips >/dev/null || {
  echo "This script needs macOS 'sips' to resize images."
  exit 1
}

ANDROID_OUT="${ROOT}/android/app/src/main/res"
IOS_OUT="${ROOT}/ios/Ethics/Images.xcassets/AppIcon.appiconset"

# --- Android adaptive foreground (safe zone–friendly square logo scales into mask)
declare -a ANDROID=(
  "mipmap-mdpi:108"
  "mipmap-hdpi:162"
  "mipmap-xhdpi:216"
  "mipmap-xxhdpi:324"
  "mipmap-xxxhdpi:432"
)

for entry in "${ANDROID[@]}"; do
  folder="${entry%%:*}"
  size="${entry##*:}"
  out="${ANDROID_OUT}/${folder}/ic_launcher_foreground.png"
  mkdir -p "${ANDROID_OUT}/${folder}"
  rm -f "${ANDROID_OUT}/${folder}/ic_launcher_foreground.xml"
  sips -z "$size" "$size" "$SRC" --out "$out" >/dev/null
  echo "Wrote $out"
done

# --- iOS AppIcon
mkdir -p "$IOS_OUT"

declare -a IOS=(
  "40:Icon-20@2x.png"
  "60:Icon-20@3x.png"
  "58:Icon-29@2x.png"
  "87:Icon-29@3x.png"
  "80:Icon-40@2x.png"
  "120:Icon-40@3x.png"
  "120:Icon-60@2x.png"
  "180:Icon-60@3x.png"
  "1024:Icon-1024.png"
)

for entry in "${IOS[@]}"; do
  px="${entry%%:*}"
  name="${entry##*:}"
  out="${IOS_OUT}/${name}"
  sips -z "$px" "$px" "$SRC" --out "$out" >/dev/null
  echo "Wrote $out"
done

cat > "${IOS_OUT}/Contents.json" << 'JSONEOF'
{
  "images": [
    {
      "size": "20x20",
      "idiom": "iphone",
      "filename": "Icon-20@2x.png",
      "scale": "2x"
    },
    {
      "size": "20x20",
      "idiom": "iphone",
      "filename": "Icon-20@3x.png",
      "scale": "3x"
    },
    {
      "size": "29x29",
      "idiom": "iphone",
      "filename": "Icon-29@2x.png",
      "scale": "2x"
    },
    {
      "size": "29x29",
      "idiom": "iphone",
      "filename": "Icon-29@3x.png",
      "scale": "3x"
    },
    {
      "size": "40x40",
      "idiom": "iphone",
      "filename": "Icon-40@2x.png",
      "scale": "2x"
    },
    {
      "size": "40x40",
      "idiom": "iphone",
      "filename": "Icon-40@3x.png",
      "scale": "3x"
    },
    {
      "size": "60x60",
      "idiom": "iphone",
      "filename": "Icon-60@2x.png",
      "scale": "2x"
    },
    {
      "size": "60x60",
      "idiom": "iphone",
      "filename": "Icon-60@3x.png",
      "scale": "3x"
    },
    {
      "size": "1024x1024",
      "idiom": "ios-marketing",
      "filename": "Icon-1024.png",
      "scale": "1x"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
JSONEOF

echo ""
echo "Done. Rebuild the native app (npx react-native run-ios / run-android) or open Xcode/Android Studio to see the new icon."
