#!/bin/bash
set -euo pipefail

PROJECT_DIR="/Users/clay/Documents/Default Project/gitpreview"
PORT=3010
LOG_DIR="$HOME/Library/Logs/GitPreview"
APP_SUPPORT_DIR="$HOME/Library/Application Support/GitPreview"
PID_FILE="$APP_SUPPORT_DIR/server.pid"
LOG_FILE="$LOG_DIR/server.log"

mkdir -p "$LOG_DIR" "$APP_SUPPORT_DIR"
mkdir -p "$PROJECT_DIR/data" "$PROJECT_DIR/projects" "$PROJECT_DIR/.gitpreview"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
  echo "$*"
}

if [ ! -d "$PROJECT_DIR" ]; then
  log "ERROR: Project directory not found: $PROJECT_DIR"
  exit 1
fi

if [ ! -f "$PROJECT_DIR/package.json" ]; then
  log "ERROR: package.json not found in $PROJECT_DIR"
  exit 1
fi

if ! command -v node &> /dev/null; then
  log "ERROR: Node.js is not installed"
  exit 1
fi

if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  log "ERROR: node_modules not found. Run 'npm ci' first."
  exit 1
fi

if [ ! -d "$PROJECT_DIR/dist" ]; then
  log "ERROR: dist not found. Run 'npm run build' first."
  exit 1
fi

if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    log "Server already running with PID $OLD_PID"
    exit 0
  else
    log "Removing stale PID file"
    rm -f "$PID_FILE"
  fi
fi

log "Starting GitPreview server on port $PORT..."

cd "$PROJECT_DIR"

PORT=$PORT node dist/modules/web-server/index.js >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "$SERVER_PID" > "$PID_FILE"
log "Server started with PID $SERVER_PID"

cleanup() {
  if [ -f "$PID_FILE" ]; then
    CURRENT_PID=$(cat "$PID_FILE")
    if [ "$CURRENT_PID" = "$SERVER_PID" ]; then
      rm -f "$PID_FILE"
      log "PID file cleaned up"
    fi
  fi
}

trap cleanup EXIT

wait "$SERVER_PID"
