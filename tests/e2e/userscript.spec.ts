import {
  copyWithShortcut,
  expect,
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
    `[${fixtureTitle}](${page.url()})`,
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
    `[${fixtureTitle}](${page.url()})`,
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

test("shortcut recorders accept Ctrl+Shift+Y", async ({
  page,
  shortcutModifier,
}) => {
  // Given: The settings panel is open with its shortcut recorders.
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  for (const command of ["copy-title", "copy-google-sheets-range"]) {
    const shortcut = page.locator(`#shortcut-${command}`);

    // When: Ctrl+Shift+Y is pressed in the shortcut recorder.
    await shortcut.press("Control+Shift+y");

    // Then: The recorder displays the captured key combination.
    await expect(shortcut).toHaveValue("Ctrl + Shift + Y");
  }
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
