#!/usr/bin/with-contenv bashio
set -euo pipefail

APP_DIR=/config
SEED_DIR=/app
TMUX_SESSION=nodejs-playground

mkdir -p "$APP_DIR"
if [[ ! -f "$APP_DIR/package.json" && -f "$SEED_DIR/package.json" ]]; then
  bashio::log.info "Seeding initial Node.js app files into add-on config folder"
  cp -a "$SEED_DIR"/. "$APP_DIR"/
fi

cat >/tmp/nodejs-playground.bashrc <<'BASHRC'
cd /config || true
alias ll='ls -la'
echo ""
echo "Node.js Playground terminal"
echo "App dir: /config"
echo "Host dir: /addon_configs/<repo>_nodejs_playground"
echo "This terminal runs inside tmux; browser refresh/reconnect will not stop your app."
echo "Run commands manually, for example:"
echo "  npm install"
echo "  npm start"
echo "Use Ctrl-C to stop a foreground server."
echo ""
BASHRC

bashio::log.info "Starting browser terminal on ingress port 7681"
exec ttyd --port 7681 --interface 0.0.0.0 --writable --terminal-type xterm-256color tmux new-session -A -s "$TMUX_SESSION" -c "$APP_DIR" /bin/bash --noprofile --rcfile /tmp/nodejs-playground.bashrc -i
