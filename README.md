# Bada Home Assistant Add-ons

Home Assistant add-on repository for small personal utilities.

## Add-ons

- [Node.js Playground](./nodejs_playground): browser terminal for manually running Node.js 22 LTS/npm apps inside Home Assistant OS.

## Add This Repository

In Home Assistant:

1. Go to **Settings > Add-ons > Add-on Store**.
2. Open the menu and choose **Repositories**.
3. Add this URL:

```text
https://github.com/ImBada/haos-nodejs-playground
```

Then install **Node.js Playground**, start it, and open the Web UI terminal.

The Node.js Playground terminal opens in the add-on public config folder (`/config` inside the container, `/addon_configs/<repo>_nodejs_playground` on the host). It runs Node.js 22 LTS and attaches to a persistent `tmux` session, so refreshing the Web UI does not stop foreground commands such as `npm start`. Use Ctrl-C in the terminal to stop the running app.

## Expose a Web Server

The add-on exposes a public web port through a small TCP proxy. By default, Home Assistant maps host port `3000` to the add-on proxy, and the proxy forwards traffic to your app on port `3000` inside the container.

If your app uses another port, change the add-on `app_port` option to match it, restart the add-on, then open:

```text
http://homeassistant.local:3000
```

You can change the public host port from the add-on **Network** section. The app itself can listen on `127.0.0.1` or `0.0.0.0`; the proxy forwards to it from inside the container.
