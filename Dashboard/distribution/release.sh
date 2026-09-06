#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# ModGuard release helper
# Usage:
#   ./release.sh sims 1.1.1          — bump Sims version in manifest
#   ./release.sh mc   1.1.1          — bump Minecraft version in manifest
#   ./release.sh both 1.1.1          — bump both
#   ./release.sh hash sims <file>    — compute sha256 for a file and print it
#
# After running, upload these files to your domain:
#   manifest.json   →  https://modguard.dk/api/updates/manifest
#   download.html   →  https://modguard.dk/download  (or /download.html)
#   *.dmg / *.exe   →  https://modguard.dk/downloads/<filename>
# ────────────────────────────────────────────────────────────────────────────
set -e

MANIFEST_FILE="$(dirname "$0")/manifest.json"

if [[ "$1" == "hash" ]]; then
  FILE="${3:-$2}"
  if [[ -z "$FILE" ]]; then echo "Usage: ./release.sh hash <file>"; exit 1; fi
  if [[ ! -f "$FILE" ]]; then echo "File not found: $FILE"; exit 1; fi
  SHA=$(shasum -a 256 "$FILE" | awk '{print $1}')
  SIZE=$(wc -c < "$FILE" | tr -d ' ')
  echo "sha256: $SHA"
  echo "size:   $SIZE bytes"
  exit 0
fi

PRODUCT="$1"
NEW_VER="$2"

if [[ -z "$PRODUCT" || -z "$NEW_VER" ]]; then
  echo "Usage: ./release.sh [sims|mc|both] <version>"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "node.js not found — please install Node.js to run this script"
  exit 1
fi

node - "$MANIFEST_FILE" "$PRODUCT" "$NEW_VER" << 'EOF'
const fs = require("fs");
const [,, file, product, ver] = process.argv;
const m = JSON.parse(fs.readFileSync(file, "utf8"));

function bump(key, v) {
  if (!m.products[key]) { console.error("Unknown product key:", key); process.exit(1); }
  const old = m.products[key].version;
  m.products[key].version = v;
  // Update filenames in download URLs
  for (const [pf, art] of Object.entries(m.products[key].download || {})) {
    if (art.fileName) art.fileName = art.fileName.replace(/\d+\.\d+\.\d+/, v);
    if (art.url)      art.url      = art.url.replace(/\d+\.\d+\.\d+/, v);
  }
  console.log(`  ${key}: ${old} → ${v}`);
}

const NOW = new Date().toISOString().slice(0, 19) + "Z";
m.updatedAt = NOW;

if (product === "sims" || product === "both") bump("modguards", ver);
if (product === "mc"   || product === "both") bump("modguard",  ver);

fs.writeFileSync(file, JSON.stringify(m, null, 2) + "\n", "utf8");
console.log("✅  manifest.json opdateret —", NOW);
console.log("👉  Upload manifest.json til: https://modguard.dk/api/updates/manifest");
EOF
