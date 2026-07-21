const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const addonDir = path.resolve(__dirname, '..');
const buildYamlPath = path.join(addonDir, 'build.yaml');
const configPath = path.join(addonDir, 'config.yaml');
const dockerfilePath = path.join(addonDir, 'Dockerfile');
const runScriptPath = path.join(addonDir, 'run.sh');

const read = (filePath) => fs.readFileSync(filePath, 'utf8');

test('config exposes the proxy, app target, and startup script options', () => {
  const config = read(configPath);

  assert.match(config, /^version:\s+0\.5\.0$/m);
  assert.match(config, /^  3210\/tcp:\s+3000$/m);
  assert.match(config, /^  3210\/tcp:\s+External web server port for your Node\.js or Bun app$/m);
  assert.match(config, /^  app_port:\s+3000$/m);
  assert.match(config, /^  startup_script:\s+""$/m);
  assert.match(config, /^  app_port:\s+port$/m);
  assert.match(config, /^  startup_script:\s+str$/m);
});

test('add-on only advertises architectures supported by Bun', () => {
  const config = read(configPath);

  assert.match(config, /^arch:\n  - aarch64\n  - amd64$/m);
  assert.doesNotMatch(config, /^  - (?:armhf|armv7|i386)$/m);
});

test('image installs socat for TCP forwarding', () => {
  const dockerfile = read(dockerfilePath);

  assert.match(dockerfile, /\bapk add --no-cache\b[\s\S]*\bsocat\b/);
});

test('build uses a base image series that provides Node.js 22 LTS', () => {
  const buildYaml = read(buildYamlPath);

  assert.match(buildYaml, /^  aarch64: ghcr\.io\/hassio-addons\/base\/aarch64:18\.2\.1$/m);
  assert.match(buildYaml, /^  amd64: ghcr\.io\/hassio-addons\/base\/amd64:18\.2\.1$/m);
});

test('image installs Node.js 22 LTS and validates the runtime major', () => {
  const dockerfile = read(dockerfilePath);

  assert.match(dockerfile, /\bapk add --no-cache\b[\s\S]*"nodejs~22"[\s\S]*\bnpm\b/);
  assert.match(dockerfile, /\bnode --version \| grep -Eq '\^v22\\\.'/);
});

test('image installs and verifies pinned Bun binaries for each supported architecture', () => {
  const dockerfile = read(dockerfilePath);

  assert.match(dockerfile, /^ARG BUN_VERSION=1\.3\.14$/m);
  assert.match(
    dockerfile,
    /amd64\)[\s\S]*BUN_TARGET=x64-musl-baseline;[\s\S]*BUN_SHA256=56a7d6806cf155536c0178f0ea5fbd098e684fa509ebdb4fc0a7e19fb65382dc/
  );
  assert.match(
    dockerfile,
    /aarch64\)[\s\S]*BUN_TARGET=aarch64-musl;[\s\S]*BUN_SHA256=b98e0ad3625c5c00d1d5b5ff55605c7adddbfae151861e68ade57b2d3b8703bb/
  );
  assert.match(dockerfile, /echo "\$\{BUN_SHA256\}  \/tmp\/bun\.zip" \| sha256sum -c -/);
  assert.match(dockerfile, /ln -s \/usr\/local\/bin\/bun \/usr\/local\/bin\/bunx/);
  assert.match(dockerfile, /bun --version \| grep -Fx "\$\{BUN_VERSION\}"/);
  assert.match(dockerfile, /bunx --version \| grep -Fx "\$\{BUN_VERSION\}"/);
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

test('run script starts the configured script once in a persistent terminal session', () => {
  const runScript = read(runScriptPath);

  assert.match(runScript, /STARTUP_SCRIPT="\$\(bashio::config 'startup_script' 2>\/dev\/null \|\| true\)"/);
  assert.match(runScript, /printf '%s\\n' "\$STARTUP_SCRIPT" >"\$STARTUP_SCRIPT_PENDING"/);
  assert.match(runScript, /mv -- "\$NODEJS_PLAYGROUND_STARTUP_PENDING" "\$NODEJS_PLAYGROUND_STARTUP_RUNNING"/);
  assert.match(runScript, /\. "\$NODEJS_PLAYGROUND_STARTUP_RUNNING"/);
  assert.match(
    runScript,
    /tmux new-session -d -s "\$TMUX_SESSION" -c "\$APP_DIR" \/bin\/bash --noprofile --rcfile \/tmp\/nodejs-playground\.bashrc -i/
  );
});

test('terminal advertises both npm and Bun commands', () => {
  const runScript = read(runScriptPath);

  assert.match(runScript, /echo "Runtimes: Node\.js \$\(node --version\), Bun \$\(bun --version\)"/);
  assert.match(runScript, /echo "  npm install"/);
  assert.match(runScript, /echo "  bun install"/);
  assert.match(runScript, /echo "  bun server\.js"/);
});

test('terminal startup script runs once even if another interactive shell starts', () => {
  const runScript = read(runScriptPath);
  const bashrcMatch = runScript.match(
    /cat >\/tmp\/nodejs-playground\.bashrc <<'BASHRC'\n([\s\S]*?)\nBASHRC/
  );
  assert.ok(bashrcMatch, 'generated terminal bashrc should be present');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodejs-playground-'));
  const bashrcPath = path.join(tempDir, 'bashrc');
  const pendingPath = path.join(tempDir, 'startup.pending.sh');
  const runningPath = path.join(tempDir, 'startup.sh');
  const markerPath = path.join(tempDir, 'startup-runs');

  try {
    fs.writeFileSync(bashrcPath, bashrcMatch[1]);
    fs.writeFileSync(pendingPath, 'printf \'ran\\n\' >>"$STARTUP_MARKER"\n');

    const env = {
      ...process.env,
      NODEJS_PLAYGROUND_APP_PORT: '3000',
      NODEJS_PLAYGROUND_STARTUP_PENDING: pendingPath,
      NODEJS_PLAYGROUND_STARTUP_RUNNING: runningPath,
      STARTUP_MARKER: markerPath,
    };
    const shellOptions = {
      cwd: tempDir,
      env,
      input: 'exit\n',
      stdio: ['pipe', 'pipe', 'pipe'],
    };

    execFileSync('bash', ['--noprofile', '--rcfile', bashrcPath, '-i'], shellOptions);
    execFileSync('bash', ['--noprofile', '--rcfile', bashrcPath, '-i'], shellOptions);

    assert.equal(read(markerPath), 'ran\n');
    assert.equal(fs.existsSync(pendingPath), false);
    assert.equal(fs.existsSync(runningPath), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('run script remains valid bash syntax', () => {
  execFileSync('bash', ['-n', runScriptPath], { stdio: 'pipe' });
});
