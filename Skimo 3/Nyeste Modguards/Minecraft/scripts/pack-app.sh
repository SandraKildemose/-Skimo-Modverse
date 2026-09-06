#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/app_asar_extracted"
APP="$ROOT/Minecraft Modverse.app"
ASAR="$APP/Contents/Resources/app.asar"

if [[ ! -d "$APP" ]]; then
  echo "Missing app bundle: $APP"
  exit 1
fi

echo "Packing app.asar..."
(cd "$SRC" && npx --yes @electron/asar pack . "$ASAR")

echo "Syncing ElectronAsarIntegrity hash (required by Electron fuse)..."
APP_BUNDLE="$APP" node "$SRC/scripts/fix-asar-integrity.js"

/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Minecraft Modverse" "$APP/Contents/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Set :CFBundleName Minecraft Modverse" "$APP/Contents/Info.plist" 2>/dev/null || true

echo "Re-signing app (required after repack)..."
codesign --force --deep --sign - "$APP"
xattr -cr "$APP" 2>/dev/null || true

echo "Done: $APP"
