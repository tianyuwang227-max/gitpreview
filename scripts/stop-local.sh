#!/bin/bash
set -euo pipefail

APP_SUPPORT_DIR="$HOME/Library/Application Support/GitPreview"
PID_FILE="$APP_SUPPORT_DIR/server.pid"
LOG_DIR="$HOME/Library/Logs/GitPreview"
LOG_FILE="$LOG_DIR/server.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
  echo "$*"
}

if [ ! -f "$PID_FILE" ]; then
  log "No PID file found. Server is not running."
  exit 0
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
  log "Process $PID is not running. Removing stale PID file."
  rm -f "$PID_FILE"
  exit 0
fi

log "Stopping server with PID $PID..."

kill "$PID" 2>/dev/null || true

for i in $(seq 1 10); do
  if ! kill -0 "$PID" 2>/dev/null; then
    log "Server stopped successfully."
    rm -f "$PID_FILE"
    exit 0
  fi
  sleep 1
done

log "Server did not stop gracefully. Sending SIGKILL..."
kill -9 "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
log "Server force stopped."
