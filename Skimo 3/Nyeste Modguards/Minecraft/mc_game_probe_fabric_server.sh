#!/usr/bin/env bash
set -euo pipefail

PROBE_DIR="${MODGUARD_PROBE_SERVER_DIR:-$(cd "$(dirname "$0")" && pwd)/modguard_fabric_probe_env}"
MODS_DIR="$PROBE_DIR/mods"
JAR="${SKIMO_PROBE_JAR:-}"
NAME="${SKIMO_PROBE_NAME:-$(basename "$JAR")}"

if [[ -z "$JAR" || ! -f "$JAR" ]]; then
  echo "SKIMO_PROBE_JAR mangler eller findes ikke" >&2
  exit 2
fi

mkdir -p "$MODS_DIR"
find "$MODS_DIR" -maxdepth 1 -type f -name '*.jar' ! -name '__modguard_runtime_probe.jar' -delete
cp "$JAR" "$MODS_DIR/__modguard_runtime_probe.jar"

cat > "$PROBE_DIR/eula.txt" <<'EULA'
eula=true
EULA

cd "$PROBE_DIR"
echo "[ModGuard probe] Starter Fabric-server med $NAME"

java -Xms256m -Xmx1400m \
  -Duser.home="$PROBE_DIR/fake_home" \
  -Djava.io.tmpdir="$PROBE_DIR/tmp" \
  -jar fabric-server-launch.jar nogui &

PID="$!"
cleanup() {
  kill "$PID" >/dev/null 2>&1 || true
  wait "$PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

mkdir -p "$PROBE_DIR/fake_home" "$PROBE_DIR/tmp"

SECONDS_LEFT="${MODGUARD_PROBE_SECONDS:-75}"
while [[ "$SECONDS_LEFT" -gt 0 ]]; do
  if ! kill -0 "$PID" >/dev/null 2>&1; then
    wait "$PID"
    exit $?
  fi
  if [[ -f "$PROBE_DIR/logs/latest.log" ]] && grep -Eiq 'Done \(|For help, type|Server thread/INFO' "$PROBE_DIR/logs/latest.log"; then
    sleep 12
    exit 0
  fi
  if [[ -f "$PROBE_DIR/logs/latest.log" ]] && grep -Eiq 'Exception|Error|Mixin apply failed|Failed to start|NoClassDefFoundError|ClassNotFoundException|UnsupportedClassVersionError' "$PROBE_DIR/logs/latest.log"; then
    tail -80 "$PROBE_DIR/logs/latest.log" >&2
    exit 1
  fi
  sleep 1
  SECONDS_LEFT=$((SECONDS_LEFT - 1))
done

echo "[ModGuard probe] Timeout mens modden blev loadet" >&2
exit 124
