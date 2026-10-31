import {
  copyWithShortcut,
  expect,
  fixtureMarkdownTitle,
  fixtureOrigin,
  fixtureTitle,
  gotoFixture,
  openSettings,
  test,
} from "./fixtures";

test("copy-title copies the page title as plain text", async ({
  page,
  shortcutModifier,
}) => {
  // Given: The fixture page is open with a title containing special characters.
  await gotoFixture(page);

  // When: The copy-title shortcut is pressed.
  const payload = await copyWithShortcut(
    page,
    `${shortcutModifier}+t`,
    fixtureTitle,
    "タイトルをクリップボードにコピーしました",
  );

  // Then: The clipboard contains only the page title as plain text, without HTML.
  expect(payload).toEqual({ "text/plain": fixtureTitle });
  expect(payload["text/html"]).toBeUndefined();
});

test("copy-link copies a valid HTML anchor with the original title", async ({
  page,
  shortcutModifier,
}) => {
  // Given: The fixture page is open with a title containing special characters.
  await gotoFixture(page);

  // When: The copy-link shortcut is pressed.
  const payload = await copyWithShortcut(
    page,
    `${shortcutModifier}+l`,
    fixtureTitle,
    "リンクをクリップボードにコピーしました",
  );

  // Then: The copied HTML is an anchor with the page URL and original title.
  const anchor = await page.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const link = doc.querySelector("a");
    return link && { href: link.href, text: link.textContent };
  }, payload["text/html"]);
  expect(anchor).toEqual({ href: page.url(), text: fixtureTitle });
});

test("copy-link-for-slack copies Markdown text and HTML", async ({
  page,
  shortcutModifier,
}) => {
  // Given: The fixture page is open with the default link format.
  await gotoFixture(page);

  // When: The copy-link-for-slack shortcut is pressed.
  const payload = await copyWithShortcut(
    page,
    `${shortcutModifier}+Shift+l`,
    `[${fixtureMarkdownTitle}](${page.url()})`,
    "リンクをクリップボードにコピーしました",
  );

  // Then: The clipboard contains the Markdown link and an HTML anchor.
  expect(payload["text/html"]).toContain("<a href=");
});

test("the toast opens settings and the close button hides them", async ({
  page,
  shortcutModifier,
}, testInfo) => {
  // Given: The fixture page is open.
  await gotoFixture(page);

  // When: Settings are opened from the copy notification toast.
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");

  // Then: The panel shows the default format and a fully visible save button.
  await expect(
    panel.getByRole("heading", { name: "copylink.dev 設定" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "保存", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(panel.locator("#sheets-range-format")).toBeVisible();
  await expect(panel.locator("#sheets-range-format")).toHaveValue(
    "htmlWithEmoji",
  );
  await page.screenshot({ path: testInfo.outputPath("settings-desktop.png") });

  // When: The close button is clicked.
  await panel.getByRole("button", { name: "×", exact: true }).click();

  // Then: The settings panel is hidden.
  await expect(panel).toBeHidden();
});

test("saved shortcuts, format, and custom emoji survive a reload", async ({
  page,
  gmStorage,
  shortcutModifier,
}) => {
  // Given: The settings panel is open on the fixture page.
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");

  // When: A new title shortcut, link format, and custom emoji are saved.
  await panel.locator("#shortcut-copy-title").press("Control+Shift+k");
  await panel.locator("#sheets-range-format").selectOption("markdown");
  await panel.locator("#customRegex1").fill("copylink-e2e\\.test");
  await panel.locator("#customWebsite1").fill(":test_link:");
  await panel.getByRole("button", { name: "保存", exact: true }).click();

  // Then: The settings are stored, the panel closes, and the new shortcut works.
  await expect(panel).toBeHidden();
  expect(gmStorage.get("sheetsRangeFormat")).toBe("markdown");
  expect(gmStorage.get("customRegexes")).toMatchObject({
    customRegex1: "copylink-e2e\\.test",
  });
  expect(gmStorage.get("emojiNames")).toMatchObject({
    customWebsite1: ":test_link:",
  });
  await copyWithShortcut(
    page,
    "Control+Shift+k",
    fixtureTitle,
    "タイトルをクリップボードにコピーしました",
  );

  // When: The page is reloaded and settings are opened using the saved shortcut.
  await page.reload();
  await page
    .locator("#copylink-dev-settings-host")
    .waitFor({ state: "attached" });
  await openSettings(page, "Control+Shift+k");

  // Then: The saved shortcut, link format, and custom emoji are restored.
  await expect(panel.locator("#shortcut-copy-title")).toHaveValue(
    "Ctrl + Shift + K",
  );
  await expect(panel.locator("#sheets-range-format")).toHaveValue("markdown");
  await expect(panel.locator("#customRegex1")).toHaveValue(
    "copylink-e2e\\.test",
  );
  await expect(panel.locator("#customWebsite1")).toHaveValue(":test_link:");

  // When: Settings are closed and the Slack link shortcut is pressed.
  await panel.getByRole("button", { name: "×", exact: true }).click();
  const payload = await copyWithShortcut(
    page,
    `${shortcutModifier}+Shift+l`,
    `[${fixtureMarkdownTitle}](${page.url()})`,
    "リンクをクリップボードにコピーしました",
  );

  // Then: The copied HTML includes the saved custom emoji.
  expect(payload["text/html"]).toContain(":test_link:");
});

test("a shortcut inside an iframe copies the top page and shows one toast", async ({
  page,
  shortcutModifier,
}) => {
  // Given: The fixture page is open and the input inside its iframe is focused.
  await gotoFixture(page);
  const frame = page.frameLocator("iframe");
  const editor = frame.locator("#editor");
  await editor.click();

  // When: The copy-title shortcut is pressed inside the iframe.
  await copyWithShortcut(
    page,
    `${shortcutModifier}+t`,
    fixtureTitle,
    "タイトルをクリップボードにコピーしました",
    editor,
  );

  // Then: The top page title is copied and only the top page shows a toast and settings host.
  await expect(page.locator(".copylink-dev-toast")).toHaveCount(1);
  await expect(frame.locator(".copylink-dev-toast")).toHaveCount(0);
  await expect(frame.locator("#copylink-dev-settings-host")).toHaveCount(0);
});

test("a dynamically added cross-origin iframe receives updated shortcuts", async ({
  page,
  shortcutModifier,
}) => {
  // Given: A cross-origin iframe is added and its default title shortcut works.
  await page.route("https://frame.copylink-e2e.test/frame.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html><body><input id="editor"></body></html>',
    }),
  );
  await gotoFixture(page);
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.title = "Cross-origin frame";
    frame.src = "https://frame.copylink-e2e.test/frame.html";
    document.body.appendChild(frame);
  });
  const frame = page.frameLocator('iframe[title="Cross-origin frame"]');
  const editor = frame.locator("#editor");
  await expect(editor).toBeVisible();
  await copyWithShortcut(
    page,
    `${shortcutModifier}+t`,
    fixtureTitle,
    "タイトルをクリップボードにコピーしました",
    editor,
  );

  // Observe synchronization so the next keypress cannot race the update.
  await editor.evaluate(() => {
    window.addEventListener("message", (event) => {
      if (
        event.source === window.top &&
        event.data?.type === "copylink-dev:sync-shortcuts" &&
        event.data.shortcuts?.["copy-title"]?.key === "k"
      ) {
        document.body.dataset.shortcutSynced = "true";
      }
    });
  });

  // When: A new title shortcut is saved in the top page's settings.
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  await panel.locator("#shortcut-copy-title").press("Control+Shift+k");
  await panel.getByRole("button", { name: "保存", exact: true }).click();

  // Then: The settings close and the iframe receives the updated shortcut.
  await expect(panel).toBeHidden();
  await expect(frame.locator("body")).toHaveAttribute(
    "data-shortcut-synced",
    "true",
  );

  const toastCount = await page.locator(".copylink-dev-toast").count();

  // When: The updated shortcut is pressed inside the iframe.
  await copyWithShortcut(
    page,
    "Control+Shift+k",
    fixtureTitle,
    "タイトルをクリップボードにコピーしました",
    editor,
  );

  // Then: The top page title is copied and only the top page shows a new toast.
  await expect(page.locator(".copylink-dev-toast")).toHaveCount(toastCount + 1);
  await expect(frame.locator(".copylink-dev-toast")).toHaveCount(0);
});

test("clipboard fallback copies the link and preserves the page selection", async ({
  page,
  shortcutModifier,
}) => {
  // Given: The native HTML clipboard write fails and page text is selected.
  await gotoFixture(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "write", {
      configurable: true,
      value: () => Promise.reject(new Error("Clipboard unavailable")),
    });
    const heading = document.querySelector("h1");
    if (!heading) {
      throw new Error("Fixture heading not found");
    }
    const range = document.createRange();
    range.selectNodeContents(heading);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });

  // When: The copy-link shortcut is pressed.
  const payload = await copyWithShortcut(
    page,
    `${shortcutModifier}+l`,
    fixtureTitle,
    "リンクをクリップボードにコピーしました",
  );

  // Then: The fallback copies the HTML link and restores the original selection.
  const anchor = await page.evaluate((html) => {
    const link = new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector("a");
    return { href: link?.href, title: link?.textContent };
  }, payload["text/html"]);
  expect(anchor).toEqual({ href: page.url(), title: fixtureTitle });
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    "UserScript E2E fixture",
  );
});

test("clipboard failure shows a failure toast with access to settings", async ({
  page,
  shortcutModifier,
}) => {
  // Given: Both the clipboard API and its fallback fail.
  await gotoFixture(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: () => Promise.reject(new Error("Clipboard unavailable")),
    });
    // oxlint-disable-next-line no-deprecated -- Simulate failure of the legacy clipboard fallback.
    document.execCommand = () => false;
  });

  // When: The copy-title shortcut is pressed.
  await page.keyboard.press(`${shortcutModifier}+t`);

  // Then: A failure toast appears and its settings button opens the panel.
  const toast = page.locator(".copylink-dev-toast").last();
  await expect(toast).toContainText("タイトルのコピーに失敗しました");
  await toast.getByRole("button", { name: "設定", exact: true }).click();
  await expect(page.locator("#copylink-dev-settings")).toBeVisible();
});

test("Alt-modified shortcuts save base keys and work after reload", async ({
  page,
  gmStorage,
  shortcutModifier,
}) => {
  // Given: Settings are open and Option+L produces layout-specific characters.
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  const shortcuts = [
    {
      command: "copy-link",
      event: { key: "¬", code: "KeyL", altKey: true, shiftKey: false },
      value: "Alt + L",
      text: fixtureTitle,
    },
    {
      command: "copy-link-for-slack",
      event: { key: "Ò", code: "KeyL", altKey: true, shiftKey: true },
      value: "Alt + Shift + L",
      text: `[${fixtureMarkdownTitle}](${page.url()})`,
    },
  ];

  // When: Both shortcuts are recorded and saved.
  for (const { command, event, value } of shortcuts) {
    const input = panel.locator(`#shortcut-${command}`);
    await input.focus();
    await input.dispatchEvent("keydown", event);
    await expect(input).toHaveValue(value);
  }
  await panel.getByRole("button", { name: "保存", exact: true }).click();
  await expect(panel).toBeHidden();

  // Then: Storage contains the base letter rather than the generated character.
  for (const { command, event } of shortcuts) {
    expect(gmStorage.get("userShortcuts")).toMatchObject({
      [command]: {
        key: "l",
        ctrl: false,
        alt: true,
        shift: event.shiftKey,
        meta: false,
      },
    });
  }

  // When: Settings are reopened after reloading the page.
  await page.reload();
  await page
    .locator("#copylink-dev-settings-host")
    .waitFor({ state: "attached" });
  await openSettings(page, `${shortcutModifier}+t`);

  // Then: Both shortcuts retain their base-key labels.
  for (const { command, value } of shortcuts) {
    await expect(panel.locator(`#shortcut-${command}`)).toHaveValue(value);
  }
  await panel.getByRole("button", { name: "×", exact: true }).click();

  // When: The browser reports the transformed characters outside settings.
  for (const { event, text } of shortcuts) {
    await page.bringToFront();
    await page.evaluate(() => navigator.clipboard.writeText("e2e sentinel"));
    await page.locator("#editor").dispatchEvent("keydown", event);

    // Then: The saved shortcut executes the corresponding copy command.
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(text);
  }
});

test("settings and the save button fit a narrow viewport", async ({
  page,
  shortcutModifier,
}, testInfo) => {
  // Given: The fixture page is open in a narrow viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoFixture(page);

  // When: The settings panel is opened.
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");

  // Then: The entire panel and save button fit within the viewport.
  await expect(panel).toBeInViewport({ ratio: 1 });
  await expect(
    panel.getByRole("button", { name: "保存", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath("settings-mobile.png") });
});

test("XML pages skip userscript initialization", async ({
  page,
  gmStorage,
}) => {
  // Given: An XML fixture is available in a fresh userscript environment.
  const xmlUrl = `${fixtureOrigin}/feed.xml`;

  // When: The XML page is loaded.
  await page.goto(xmlUrl);

  // Then: The userscript creates neither a settings host nor stored values.
  await expect(page.locator("#copylink-dev-settings-host")).toHaveCount(0);
  expect(gmStorage.size).toBe(0);
});

test("shortcut recorders capture keys without triggering page handlers", async ({
  page,
  shortcutModifier,
}) => {
  // Given: Settings are open and the page listens for keydown events.
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  await page.evaluate(() => {
    document.addEventListener("keydown", () => {
      document.body.dataset.documentKeydownTriggered = "true";
    });
    window.addEventListener("keydown", () => {
      document.body.dataset.windowKeydownTriggered = "true";
    });
  });
  for (const command of ["copy-title", "copy-google-sheets-range"]) {
    const shortcut = page.locator(`#shortcut-${command}`);
    for (const { keys, value } of [
      { keys: "Shift", value: "Shift" },
      { keys: "Control", value: "Ctrl" },
      { keys: "Alt", value: "Alt" },
      { keys: "Meta", value: /^(⌘|Win)$/ },
      { keys: "Control+Shift", value: "Ctrl + Shift" },
      { keys: "Control+Shift+y", value: "Ctrl + Shift + Y" },
      { keys: "Alt+k", value: "Alt + K" },
      { keys: "g", value: "G" },
    ]) {
      // When: Keys are pressed in the shortcut recorder.
      await shortcut.press(keys);

      // Then: The recorder captures the keys without triggering page handlers.
      await expect(shortcut).toHaveValue(value);
      expect(
        await page.evaluate(() => ({
          document: document.body.dataset.documentKeydownTriggered,
          window: document.body.dataset.windowKeydownTriggered,
        })),
      ).toEqual({ document: undefined, window: undefined });
    }

    for (const { event, value } of [
      {
        event: { key: "¬", code: "KeyL", altKey: true },
        value: "Alt + L",
      },
      {
        event: { key: "Ò", code: "KeyL", altKey: true, shiftKey: true },
        value: "Alt + Shift + L",
      },
      {
        event: { key: "¡", code: "Digit1", altKey: true },
        value: "Alt + 1",
      },
      {
        event: { key: "q", code: "KeyA", ctrlKey: true },
        value: "Ctrl + Q",
      },
      {
        event: { key: "Enter", code: "Enter", altKey: true },
        value: "Alt + ENTER",
      },
    ]) {
      // When: The browser reports a generated character and its physical key.
      await shortcut.dispatchEvent("keydown", event);

      // Then: Alt-modified letters/digits use their base key; other keys keep their labels.
      await expect(shortcut).toHaveValue(value);
    }
  }

  // When: The key combination is pressed in an input outside settings.
  await page.locator("#editor").press("Control+Shift+y");

  // Then: Both page handlers receive keydown events normally.
  expect(
    await page.evaluate(() => ({
      document: document.body.dataset.documentKeydownTriggered,
      window: document.body.dataset.windowKeydownTriggered,
    })),
  ).toEqual({ document: "true", window: "true" });
});

test("editing shortcuts stay inside editable settings fields", async ({
  page,
  shortcutModifier,
}) => {
  // Given: A settings field contains text and the page listens for Ctrl+A.
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  await page.evaluate(() => {
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === "a") {
        document.body.dataset.siteShortcutTriggered = "true";
      }
    });
  });
  const input = page.locator("#customRegex1");
  await input.fill("example\\.com");

  // When: Ctrl+A is pressed inside the settings field.
  await input.press("Control+a");

  // Then: The page's shortcut handler is not triggered.
  expect(
    await page.evaluate(() => document.body.dataset.siteShortcutTriggered),
  ).toBeUndefined();
});
