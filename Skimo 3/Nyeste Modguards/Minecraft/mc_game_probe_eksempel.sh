#!/usr/bin/env bash
set -euo pipefail

INSTANCE_ID="${MODGUARD_PRISM_INSTANCE_ID:-}"
PRISM_ROOT="${MODGUARD_PRISM_ROOT:-$HOME/Library/Application Support/PrismLauncher}"
PRISM_CMD="${MODGUARD_PRISM_CMD:-/Applications/Prism Launcher.app/Contents/MacOS/prismlauncher}"
JAR="${SKIMO_PROBE_JAR:-}"

if [[ -z "$INSTANCE_ID" ]]; then
  echo "MODGUARD_PRISM_INSTANCE_ID mangler" >&2
  exit 2
fi
if [[ -z "$JAR" || ! -f "$JAR" ]]; then
  echo "SKIMO_PROBE_JAR mangler eller findes ikke" >&2
  exit 2
fi

INSTANCE_MC="$PRISM_ROOT/instances/$INSTANCE_ID/minecraft"
MODS_DIR="$INSTANCE_MC/mods"
if [[ ! -d "$MODS_DIR" ]]; then
  echo "Prism mods-mappe findes ikke: $MODS_DIR" >&2
  exit 2
fi
if [[ ! -x "$PRISM_CMD" ]]; then
  echo "Prism Launcher blev ikke fundet: $PRISM_CMD" >&2
  exit 2
fi

mkdir -p "$MODS_DIR"
find "$MODS_DIR" -maxdepth 1 -type f -name '__modguard_runtime_probe.jar' -delete
cp "$JAR" "$MODS_DIR/__modguard_runtime_probe.jar"

echo "[ModGuard probe] Starter Prism-instans $INSTANCE_ID"
"$PRISM_CMD" --launch "$INSTANCE_ID" &
PID="$!"

cleanup() {
  kill "$PID" >/dev/null 2>&1 || true
  find "$MODS_DIR" -maxdepth 1 -type f -name '__modguard_runtime_probe.jar' -delete
}
trap cleanup EXIT

sleep "${MODGUARD_PRISM_PROBE_SECONDS:-90}"
exit 0
