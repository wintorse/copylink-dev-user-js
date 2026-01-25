# copylink-dev.user.js （UserScript）

This repository provides a UserScript version of [copylink-dev](https://github.com/wintorse/copylink-dev) that can be used in browsers where Chrome extensions are not available (e.g., Safari). It also includes the browser extension source as a git submodule.

## Differences from the copylink-dev submodule

- Shortcut settings can be configured from the settings panel opened via the toast's **Settings** button.
- Emoji and custom website settings are also managed in the same settings panel.
- Works in browsers that do not support Chrome extensions (e.g., Safari) by using UserScript.

## Submodule

This repository uses `copylink-dev` as a git submodule.

## Release Sync

The latest release is automatically mirrored to the Gist below by a workflow:

- https://gist.github.com/wintorse/10e2ec0206a0f29522cb06c6dafd2611

## Clone

When cloning this repository, use a recursive clone so the submodule is fetched:

```sh
git clone --recursive git@github.com:wintorse/copylink-dev-user-js.git
```
