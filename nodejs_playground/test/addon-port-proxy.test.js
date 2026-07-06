const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const addonDir = path.resolve(__dirname, '..');
const buildYamlPath = path.join(addonDir, 'build.yaml');
const configPath = path.join(addonDir, 'config.yaml');
const dockerfilePath = path.join(addonDir, 'Dockerfile');
const runScriptPath = path.join(addonDir, 'run.sh');

const read = (filePath) => fs.readFileSync(filePath, 'utf8');

test('config exposes a stable proxy port and configurable app target port', () => {
  const config = read(configPath);

  assert.match(config, /^version:\s+0\.3\.8$/m);
  assert.match(config, /^  3210\/tcp:\s+3000$/m);
  assert.match(config, /^  3210\/tcp:\s+External web server port for your Node\.js app$/m);
  assert.match(config, /^  app_port:\s+3000$/m);
  assert.match(config, /^  app_port:\s+port$/m);
});

test('image installs socat for TCP forwarding', () => {
  const dockerfile = read(dockerfilePath);

  assert.match(dockerfile, /\bapk add --no-cache\b[\s\S]*\bsocat\b/);
});

test('build uses a base image series that provides Node.js 22 LTS', () => {
  const buildYaml = read(buildYamlPath);

  assert.match(buildYaml, /^  aarch64: ghcr\.io\/hassio-addons\/base\/aarch64:18\.2\.1$/m);
  assert.match(buildYaml, /^  amd64: ghcr\.io\/hassio-addons\/base\/amd64:18\.2\.1$/m);
  assert.match(buildYaml, /^  armhf: ghcr\.io\/hassio-addons\/base\/armhf:18\.2\.1$/m);
  assert.match(buildYaml, /^  armv7: ghcr\.io\/hassio-addons\/base\/armv7:18\.2\.1$/m);
  assert.match(buildYaml, /^  i386: ghcr\.io\/hassio-addons\/base\/i386:18\.2\.1$/m);
});

test('image installs Node.js 22 LTS and validates the runtime major', () => {
  const dockerfile = read(dockerfilePath);

  assert.match(dockerfile, /\bapk add --no-cache\b[\s\S]*"nodejs~22"[\s\S]*\bnpm\b/);
  assert.match(dockerfile, /\bnode --version \| grep -Eq '\^v22\\\.'/);
});

test('run script forwards public web traffic to the configured app port', () => {
  const runScript = read(runScriptPath);

  assert.match(runScript, /^PUBLIC_WEB_PORT=3210$/m);
  assert.match(runScript, /APP_PORT="\$\(bashio::config 'app_port' 2>\/dev\/null \|\| true\)"/);
  assert.match(runScript, /if \[\[ -z "\$APP_PORT" \|\| "\$APP_PORT" == "null" \]\]; then/);
  assert.match(
    runScript,
    /socat "TCP-LISTEN:\$\{PUBLIC_WEB_PORT\},fork,reuseaddr,bind=0\.0\.0\.0" "TCP:127\.0\.0\.1:\$\{APP_PORT\}" &/
  );
});

test('run script remains valid bash syntax', () => {
  execFileSync('bash', ['-n', runScriptPath], { stdio: 'pipe' });
});
