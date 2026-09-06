#!/bin/bash
set -euo pipefail

VERSION="${1:-1.0.8}"
BUILD_DATE="${2:-2026.07.04.5}"
APP_NAME="Sims ModGuard Lite ${VERSION}.app"
DESKTOP="$HOME/Desktop"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$DESKTOP/skimo-modguard-build"
OUT_APP="$STAGE/Sims ModGuard Lite-darwin-arm64/Sims ModGuard Lite.app"
DEST="$DESKTOP/$APP_NAME"

echo "[build] Packaging from $SRC"
rm -rf "$STAGE"
cd "$SRC"
npx --yes electron-packager . "Sims ModGuard Lite" \
  --platform=darwin \
  --arch=arm64 \
  --out="$STAGE" \
  --overwrite \
  --icon="build/icon.icns" \
  --app-version="$VERSION" \
  --build-version="$BUILD_DATE" \
  --app-bundle-id="com.skimo.sims.modguardlite"

echo "[build] Removing ElectronAsarIntegrity if present"
/usr/libexec/PlistBuddy -c "Delete :ElectronAsarIntegrity" "$OUT_APP/Contents/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Sims ModGuard Lite ${VERSION}" "$OUT_APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleName Sims ModGuard Lite ${VERSION}" "$OUT_APP/Contents/Info.plist"

echo "[build] Signing"
xattr -cr "$OUT_APP"
codesign --force --sign - "$OUT_APP/Contents/Frameworks/Electron Framework.framework"
codesign --force --deep --sign - "$OUT_APP"

echo "[build] Installing to Desktop"
rm -rf "$DEST"
rm -rf "$DESKTOP/Sims ModGuard Lite.app"
rm -rf "$DESKTOP/Sims ModGuard Lite 1.0.7.app"
ditto "$OUT_APP" "$DEST"
xattr -cr "$DEST"
codesign --force --sign - "$DEST/Contents/Frameworks/Electron Framework.framework"
codesign --force --deep --sign - "$DEST"

echo "[build] Smoke test (direct launch 5s)"
pkill -f "Sims ModGuard Lite" 2>/dev/null || true
sleep 1
if timeout 5 "$DEST/Contents/MacOS/Sims ModGuard Lite" >/dev/null 2>&1; then
  echo "[build] DIRECT_LAUNCH_OK"
else
  code=$?
  if [ "$code" -eq 124 ]; then
    echo "[build] DIRECT_LAUNCH_OK"
  else
    echo "[build] DIRECT_LAUNCH_FAIL (exit $code)"
    exit 1
  fi
fi
pkill -f "Sims ModGuard Lite" 2>/dev/null || true

echo "[build] Done: $DEST"
