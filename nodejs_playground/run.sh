#!/usr/bin/with-contenv bashio
set -euo pipefail

APP_DIR=/config
SEED_DIR=/app
TMUX_SESSION=nodejs-playground
PUBLIC_WEB_PORT=3210

APP_PORT="$(bashio::config 'app_port' 2>/dev/null || true)"
if [[ -z "$APP_PORT" || "$APP_PORT" == "null" ]]; then
  APP_PORT=3000
fi

if ! [[ "$APP_PORT" =~ ^[0-9]+$ ]] || (( APP_PORT < 1 || APP_PORT > 65535 )); then
  echo "ERROR: app_port must be a valid TCP port, got: ${APP_PORT}" >&2
  exit 1
fi

mkdir -p "$APP_DIR"
if [[ ! -f "$APP_DIR/package.json" && -f "$SEED_DIR/package.json" ]]; then
  bashio::log.info "Seeding initial Node.js app files into add-on config folder"
  cp -a "$SEED_DIR"/. "$APP_DIR"/
fi

bashio::log.info "Forwarding external web traffic on container port ${PUBLIC_WEB_PORT} to app port ${APP_PORT}"
socat "TCP-LISTEN:${PUBLIC_WEB_PORT},fork,reuseaddr,bind=0.0.0.0" "TCP:127.0.0.1:${APP_PORT}" &

cat >/tmp/nodejs-playground.bashrc <<BASHRC
cd /config || true
alias ll='ls -la'
echo ""
echo "Node.js Playground terminal"
echo "App dir: /config"
echo "Host dir: /addon_configs/<repo>_nodejs_playground"
echo "This terminal runs inside tmux; browser refresh/reconnect will not stop your app."
echo "External web port: 3000 by default, configurable in the add-on Network section."
echo "Forward target app port: ${APP_PORT}"
echo "Run commands manually, for example:"
echo "  npm install"
echo "  npm start"
echo "Set the add-on app_port option if your web server uses another port."
echo "Use Ctrl-C to stop a foreground server."
echo ""
BASHRC

bashio::log.info "Starting browser terminal on ingress port 7681"
exec ttyd --port 7681 --interface 0.0.0.0 --writable --terminal-type xterm-256color tmux new-session -A -s "$TMUX_SESSION" -c "$APP_DIR" /bin/bash --noprofile --rcfile /tmp/nodejs-playground.bashrc -i
