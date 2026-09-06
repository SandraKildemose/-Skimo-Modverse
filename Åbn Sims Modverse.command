#!/bin/bash
REAL_BIN="/Users/sandrakildemose/Desktop/Skimo/Skimo 3/Nyeste Modguards/Sims/Sims Modverse.app/Contents/MacOS/SKIMO ModGuardS"
pkill -f "$REAL_BIN" 2>/dev/null || true
sleep 0.3
exec "$REAL_BIN"
