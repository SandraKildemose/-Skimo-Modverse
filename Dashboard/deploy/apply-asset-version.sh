#!/usr/bin/env bash
# Kør fra Dashboard-mappen: bash deploy/apply-asset-version.sh
# Opdaterer ?v= i alle *.html i projektroden til indholdet af deploy/VERSION.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
VER_FILE="$DIR/VERSION"
if [[ ! -f "$VER_FILE" ]]; then
  echo "Mangler $VER_FILE"
  exit 1
fi
VER="$(tr -d ' \t\n\r' < "$VER_FILE")"
if [[ -z "$VER" ]]; then
  echo "VERSION er tom"
  exit 1
fi

shopt -s nullglob
for f in "$ROOT"/*.html; do
  [[ -f "$f" ]] || continue
  if perl -v >/dev/null 2>&1; then
    perl -i -pe 's/\?v=[A-Za-z0-9_.-]+/?v='"$VER"'/g' "$f"
  else
    sed -i.bak -E "s/\\?v=[A-Za-z0-9_.-]+/?v=${VER}/g" "$f" && rm -f "${f}.bak"
  fi
done

echo "Sat ?v=${VER} i HTML-filer i $ROOT"
echo "Næste skridt: upload HELE mappen (inkl. _headers og assets/) til serveren."
