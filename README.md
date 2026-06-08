# HAOS Node.js Playground

A Home Assistant OS local add-on template that opens a browser terminal for running arbitrary Node.js/npm apps. Drop your npm project into `app/`, install the add-on, open the add-on Web UI, and run commands yourself.

The add-on intentionally does not auto-run `npm install` or `npm start`. It just gives you an interactive terminal in `/app`.

## Layout

```text
haos-nodejs-playground/
  config.yaml      # Home Assistant add-on metadata/options
  build.yaml       # Build bases per architecture
  Dockerfile       # Node.js + ttyd runtime image
  run.sh           # Starts the browser terminal
  app/             # Put your Node.js project here
```

## Quick Start

1. Copy this repository into your HAOS add-ons directory, for example `/addons/haos-nodejs-playground`, or add it as a local add-on repository.
2. Reload local add-ons in Home Assistant.
3. Install **Node.js Playground**.
4. Put your npm app in `app/`. At minimum it should have a `package.json`.
5. Start the add-on and open its Web UI. A terminal opens in `/app`.
6. Run your commands manually:

```bash
npm install
npm start
```

Use Ctrl-C in the terminal to stop a foreground server.

## Options

Only environment variables are configurable by default:

```yaml
env:
  NODE_ENV: production
  PORT: "3000"
```

## Ports

The add-on Web UI is the browser terminal through Home Assistant ingress. The template also exposes container port `3000/tcp` to host port `3000` for your Node app. If your app uses another port, either set `PORT=3000` or edit `config.yaml`.

## Persistence

The add-on maps these Home Assistant folders into the container:

- `/config`
- `/share`
- `/ssl`
- `/media`
- `/backup`

Use those paths for persistent runtime data. Files baked into `app/` are part of the add-on image and should be treated like deploy artifacts.
