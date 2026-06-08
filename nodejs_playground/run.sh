#!/usr/bin/with-contenv bashio
set -euo pipefail

cd /app

cat >/etc/profile.d/nodejs-playground.sh <<'PROFILE'
cd /app
alias ll='ls -la'
echo ""
echo "Node.js Playground terminal"
echo "App dir: /app"
echo "Run commands manually, for example:"
echo "  npm install"
echo "  npm start"
echo "Use Ctrl-C to stop a foreground server."
echo ""
PROFILE

bashio::log.info "Starting browser terminal on ingress port 7681"
exec ttyd --port 7681 --interface 0.0.0.0 --writable --terminal-type xterm-256color --check-origin false /bin/bash -l
