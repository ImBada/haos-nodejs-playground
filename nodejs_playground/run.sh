#!/usr/bin/with-contenv bashio
set -euo pipefail

APP_DIR=/config
SEED_DIR=/app
TMUX_SESSION=nodejs-playground
PUBLIC_WEB_PORT=3210
STARTUP_SCRIPT_PENDING=/tmp/nodejs-playground-startup.pending.sh
STARTUP_SCRIPT_RUNNING=/tmp/nodejs-playground-startup.sh

APP_PORT="$(bashio::config 'app_port' 2>/dev/null || true)"
if [[ -z "$APP_PORT" || "$APP_PORT" == "null" ]]; then
  APP_PORT=3000
fi

if ! [[ "$APP_PORT" =~ ^[0-9]+$ ]] || (( APP_PORT < 1 || APP_PORT > 65535 )); then
  echo "ERROR: app_port must be a valid TCP port, got: ${APP_PORT}" >&2
  exit 1
fi

STARTUP_SCRIPT="$(bashio::config 'startup_script' 2>/dev/null || true)"
if [[ "$STARTUP_SCRIPT" == "null" ]]; then
  STARTUP_SCRIPT=""
fi

mkdir -p "$APP_DIR"
if [[ ! -f "$APP_DIR/package.json" && -f "$SEED_DIR/package.json" ]]; then
  bashio::log.info "Seeding initial Node.js app files into add-on config folder"
  cp -a "$SEED_DIR"/. "$APP_DIR"/
fi

bashio::log.info "Forwarding external web traffic on container port ${PUBLIC_WEB_PORT} to app port ${APP_PORT}"
socat "TCP-LISTEN:${PUBLIC_WEB_PORT},fork,reuseaddr,bind=0.0.0.0" "TCP:127.0.0.1:${APP_PORT}" &

rm -f -- "$STARTUP_SCRIPT_PENDING" "$STARTUP_SCRIPT_RUNNING"
if [[ -n "$STARTUP_SCRIPT" ]]; then
  printf '%s\n' "$STARTUP_SCRIPT" >"$STARTUP_SCRIPT_PENDING"
  bashio::log.info "Startup script is configured and will run in the terminal session"
fi

export NODEJS_PLAYGROUND_APP_PORT="$APP_PORT"
export NODEJS_PLAYGROUND_STARTUP_PENDING="$STARTUP_SCRIPT_PENDING"
export NODEJS_PLAYGROUND_STARTUP_RUNNING="$STARTUP_SCRIPT_RUNNING"

cat >/tmp/nodejs-playground.bashrc <<'BASHRC'
cd /config || true
alias ll='ls -la'
echo ""
echo "Node.js Playground terminal"
echo "App dir: /config"
echo "Host dir: /addon_configs/<repo>_nodejs_playground"
echo "This terminal runs inside tmux; browser refresh/reconnect will not stop your app."
echo "External web port: 3000 by default, configurable in the add-on Network section."
echo "Forward target app port: ${NODEJS_PLAYGROUND_APP_PORT}"
echo "Run commands manually, for example:"
echo "  npm install"
echo "  npm start"
echo "Set startup_script in the add-on configuration to run commands automatically."
echo "Set the add-on app_port option if your web server uses another port."
echo "Use Ctrl-C to stop a foreground server."
echo ""

if [[ -s "$NODEJS_PLAYGROUND_STARTUP_PENDING" ]]; then
  mv -- "$NODEJS_PLAYGROUND_STARTUP_PENDING" "$NODEJS_PLAYGROUND_STARTUP_RUNNING"
  echo "Running configured startup script..."
  # Run in this interactive shell so its output and foreground process remain
  # visible and controllable after attaching through the browser terminal.
  . "$NODEJS_PLAYGROUND_STARTUP_RUNNING"
  startup_status=$?
  if (( startup_status != 0 )); then
    echo "Startup script exited with status ${startup_status}."
  fi
  unset startup_status
fi
BASHRC

bashio::log.info "Starting persistent terminal session"
tmux new-session -d -s "$TMUX_SESSION" -c "$APP_DIR" /bin/bash --noprofile --rcfile /tmp/nodejs-playground.bashrc -i

bashio::log.info "Starting browser terminal on ingress port 7681"
exec ttyd --port 7681 --interface 0.0.0.0 --writable --terminal-type xterm-256color tmux new-session -A -s "$TMUX_SESSION" -c "$APP_DIR" /bin/bash --noprofile --rcfile /tmp/nodejs-playground.bashrc -i
