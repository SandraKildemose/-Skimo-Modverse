#!/usr/bin/env bash
set -euo pipefail

SERVER_DIR="${MODGUARD_PROBE_SERVER_DIR:-$(cd "$(dirname "$0")/.." && pwd)/modguard_fabric_probe_env}"
FABRIC_VERSION="${MODGUARD_FABRIC_VERSION:-0.15.11}"
MC_VERSION="${MODGUARD_MC_VERSION:-1.20.1}"
INSTALLER_URL="https://meta.fabricmc.net/v2/versions/loader/${MC_VERSION}/${FABRIC_VERSION}/1.0.1/server/jar"

mkdir -p "$SERVER_DIR/mods" "$SERVER_DIR/tmp" "$SERVER_DIR/fake_home"
cd "$SERVER_DIR"

if ! command -v java >/dev/null 2>&1; then
  echo "Java blev ikke fundet. Installer Java 17+ før ModGuard runtime-probe." >&2
  exit 2
fi

if [[ ! -f fabric-server-launch.jar ]]; then
  echo "[ModGuard setup] Henter Fabric server launch jar til Minecraft ${MC_VERSION}"
  if command -v curl >/dev/null 2>&1; then
    curl -fL "$INSTALLER_URL" -o fabric-server-launch.jar
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import sys, urllib.request; urllib.request.urlretrieve(sys.argv[1], sys.argv[2])' "$INSTALLER_URL" fabric-server-launch.jar
  else
    echo "Mangler curl eller python3 til download." >&2
    exit 3
  fi
fi

cat > eula.txt <<'EULA'
eula=true
EULA

echo "[ModGuard setup] Fabric probe-server klar: $SERVER_DIR"
