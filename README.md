# Bada Home Assistant Add-ons

Home Assistant add-on repository for small personal utilities.

## Add-ons

- [Node.js Playground](./nodejs_playground): browser terminal for manually running Node.js/npm apps inside Home Assistant OS.

## Add This Repository

In Home Assistant:

1. Go to **Settings > Add-ons > Add-on Store**.
2. Open the menu and choose **Repositories**.
3. Add this URL:

```text
https://github.com/ImBada/haos-nodejs-playground
```

Then install **Node.js Playground**, start it, and open the Web UI terminal.

The Node.js Playground terminal opens in the add-on public config folder (`/config` inside the container, `/addon_configs/<repo>_nodejs_playground` on the host). It attaches to a persistent `tmux` session, so refreshing the Web UI does not stop foreground commands such as `npm start`. Use Ctrl-C in the terminal to stop the running app.
