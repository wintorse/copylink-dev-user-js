[日本語版 README はこちら](./README-ja.md)

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

## Installation

### Chromium-based browsers

1. Install Tampermonkey from the Chrome Web Store.
2. Open Tampermonkey's details under `chrome://extensions/` and enable **Allow userscripts**.
3. Visit https://gist.github.com/wintorse/10e2ec0206a0f29522cb06c6dafd2611/raw/copylink-dev.user.js.
4. Follow the on-screen instructions to install the userscript.

### Safari

1. Install [Userscripts](https://apps.apple.com/jp/app/userscripts/id1463298887) from the App Store.
2. Click the Userscripts icon in Safari's tab bar and select "Open Extension Page".
3. Click the **+** button, choose "New Remote", and enter
   `https://gist.github.com/wintorse/10e2ec0206a0f29522cb06c6dafd2611/raw/copylink-dev.user.js`.
4. Click **Save** in the bottom-right corner.

## Updates

### Chromium-based browsers

1. Click the Tampermonkey icon in your browser.
2. In the pop-up menu, select "Utilities" and then click "Check for userscript updates".
3. Follow the on-screen instructions to update.

### Safari

1. Click the icon displayed in Safari's tab bar and select "Open Extension Page".
2. Select copylink.dev (proceed to the next step if already selected).
3. Press the refresh button located in the upper right corner of the screen.

## Clone

When cloning this repository, use a recursive clone so the submodule is fetched:

```sh
git clone --recursive git@github.com:wintorse/copylink-dev-user-js.git
```
