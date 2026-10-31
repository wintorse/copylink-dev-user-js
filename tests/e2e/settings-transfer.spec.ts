import {
  copyWithShortcut,
  expect,
  fixtureMarkdownTitle,
  gotoFixture,
  openSettings,
  readClipboard,
  test,
} from "./fixtures";
import { DEFAULT_EMOJI_NAMES } from "../../src/copylink-dev/src/shared/constants";

test("export copies saved settings in the extension's JSON format", async ({
  page,
  gmStorage,
  shortcutModifier,
}) => {
  // Given: Saved emoji settings differ from an unsaved edit in the form.
  const emojiNames = { github: ":saved:", customWebsite1: ":custom:" };
  const customRegexes = { customRegex1: "example\\.com" };
  gmStorage.set("emojiNames", emojiNames);
  gmStorage.set("customRegexes", customRegexes);
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  await panel.locator("#github").fill(":unsaved:");

  // When: The saved settings are exported.
  await panel
    .getByRole("button", { name: "エクスポート", exact: true })
    .click();

  // Then: The clipboard has both sections and the unsaved edit stays in the form.
  await expect(panel.locator("#exportMessage")).toHaveText(
    "絵文字名とカスタム正規表現をクリップボードにコピーしました",
  );
  const payload = await readClipboard(page);
  expect(JSON.parse(payload["text/plain"])).toEqual({
    emojiNames,
    customRegexes,
  });
  expect(payload["text/html"]).toBeUndefined();
  await expect(panel.locator("#github")).toHaveValue(":unsaved:");
});

test("export includes empty sections when no settings have been saved", async ({
  page,
  shortcutModifier,
}) => {
  // Given: The settings panel is open with no saved emoji or regex overrides.
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");

  // When: Settings are exported.
  await panel.locator("#exportButton").click();

  // Then: The exported JSON includes empty, importable sections.
  await expect(panel.locator("#exportMessage")).toContainText("コピーしました");
  expect(JSON.parse((await readClipboard(page))["text/plain"])).toEqual({
    emojiNames: {},
    customRegexes: {},
  });
});

test("import saves normalized settings and immediately uses them when copying", async ({
  page,
  gmStorage,
  shortcutModifier,
}, testInfo) => {
  // Given: Existing regexes, shortcuts, and a range format have been saved.
  const shortcuts = {
    "copy-link": { key: "j", ctrl: true, alt: false, shift: true, meta: false },
  };
  gmStorage.set("customRegexes", { customRegex2: "old" });
  gmStorage.set("userShortcuts", shortcuts);
  gmStorage.set("sheetsRangeFormat", "markdown");
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  await panel.locator("#sheets-range-format").selectOption("plainUrl");
  await panel.locator("#shortcut-copy-link").press("Control+Shift+k");

  // When: Extension-compatible JSON is pasted and the import is confirmed.
  await panel.getByRole("button", { name: "インポート", exact: true }).click();
  await expect(panel.locator("#importTextarea")).toBeFocused();
  await panel.locator("#importTextarea").fill(
    JSON.stringify({
      emojiNames: {
        githubPullRequest: " imported_pr ",
        customWebsite1: "custom_import",
      },
      customRegexes: { customRegex1: "copylink-e2e\\.test" },
    }),
  );
  await panel.getByRole("button", { name: "上書きして設定を保存" }).click();

  // Then: Imported sections refresh, while other settings and unsaved edits remain.
  await expect(panel.locator("#importMessage")).toHaveText(
    "設定をインポートしました",
  );
  await expect(panel.locator("#githubPullRequest")).toHaveValue(
    ":imported_pr:",
  );
  await expect(panel.locator("#githubOpenPullRequest")).toHaveValue("");
  await expect(panel.locator("#githubOpenPullRequest")).toHaveAttribute(
    "placeholder",
    ":imported_pr:",
  );
  await expect(panel.locator("#customRegex2")).toHaveValue("");
  await expect(panel.locator("#sheets-range-format")).toHaveValue("plainUrl");
  await expect(panel.locator("#shortcut-copy-link")).toHaveValue(
    "Ctrl + Shift + K",
  );
  expect(gmStorage.get("customRegexes")).toEqual({
    customRegex1: "copylink-e2e\\.test",
  });
  expect(gmStorage.get("emojiNames")).toMatchObject({
    customWebsite1: ":custom_import:",
  });
  expect(gmStorage.get("emojiNames")).not.toHaveProperty(
    "githubOpenPullRequest",
  );
  expect(gmStorage.get("userShortcuts")).toEqual(shortcuts);
  expect(gmStorage.get("sheetsRangeFormat")).toBe("markdown");
  await panel.locator("#importTextarea").scrollIntoViewIfNeeded();
  await expect(panel.locator("#importTextarea")).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: testInfo.outputPath("settings-import-mobile.png"),
  });

  // When: The panel is closed without pressing Save and a Slack link is copied.
  await panel.getByRole("button", { name: "×", exact: true }).click();
  const payload = await copyWithShortcut(
    page,
    `${shortcutModifier}+Shift+l`,
    `[${fixtureMarkdownTitle}](${page.url()})`,
    "リンクをクリップボードにコピーしました",
  );

  // Then: The copy uses the imported emoji from the refreshed userscript cache.
  expect(payload["text/html"]).toContain(":custom_import:");

  // When: Settings are reopened after a page reload.
  await page.reload();
  await page
    .locator("#copylink-dev-settings-host")
    .waitFor({ state: "attached" });
  await openSettings(page, `${shortcutModifier}+t`);

  // Then: Imported settings persist and transient import UI is reset.
  await expect(panel.locator("#customWebsite1")).toHaveValue(":custom_import:");
  await expect(panel.locator("#customRegex1")).toHaveValue(
    "copylink-e2e\\.test",
  );
  await expect(panel.locator("#importGroup")).toBeHidden();
  await expect(panel.locator("#sheets-range-format")).toHaveValue("markdown");
});

test("an already open tab uses settings imported in another tab", async ({
  page,
  context,
  gmStorage,
  shortcutModifier,
}) => {
  // Given: Two pages have loaded the old emoji and custom regex settings.
  gmStorage.set("emojiNames", { customWebsite1: ":old:" });
  gmStorage.set("customRegexes", { customRegex1: "copylink-e2e\\.test" });
  await gotoFixture(page);
  const otherPage = await context.newPage();
  await gotoFixture(otherPage);
  const markdown = `[${fixtureMarkdownTitle}](${otherPage.url()})`;
  const oldPayload = await copyWithShortcut(
    otherPage,
    `${shortcutModifier}+Shift+l`,
    markdown,
    "リンクをクリップボードにコピーしました",
  );
  expect(oldPayload["text/html"]).toContain(":old:");

  // When: Different emoji and regex settings are imported in the first page.
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  await panel.locator("#importButton").click();
  await panel.locator("#importTextarea").fill(
    JSON.stringify({
      emojiNames: {
        customWebsite1: ":wrong_match:",
        customWebsite2: ":imported:",
      },
      customRegexes: {
        customRegex1: "never-match",
        customRegex2: "copylink-e2e\\.test",
      },
    }),
  );
  await panel.locator("#importConfirmButton").click();
  await expect(panel.locator("#importMessage")).toHaveText(
    "設定をインポートしました",
  );

  // When: A link is copied in the other page without reloading or reopening settings.
  const payload = await copyWithShortcut(
    otherPage,
    `${shortcutModifier}+Shift+l`,
    markdown,
    "リンクをクリップボードにコピーしました",
  );

  // Then: Both the imported emoji and its new regex are used.
  expect(payload["text/html"]).toContain(":imported:");
  expect(payload["text/html"]).not.toContain(":old:");
  expect(payload["text/html"]).not.toContain(":wrong_match:");
  await otherPage.close();
});

test("imported Draft PR emoji is used in the current and an already open PR tab", async ({
  page,
  context,
  shortcutModifier,
}) => {
  // Given: A Draft PR tab is already open before settings are imported.
  const url = "https://github.com/example/project/pull/123";
  await context.route(url, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html><head><title>PR page</title></head><body><header data-component="SplitPageLayout.Header"><span data-component="StateLabel" data-status="draft">Draft</span></header><h1><span>Add search filters</span></h1></body></html>',
    }),
  );
  await page.goto(url);
  await page
    .locator("#copylink-dev-settings-host")
    .waitFor({ state: "attached" });
  const otherPage = await context.newPage();
  await otherPage.goto(url);
  await otherPage
    .locator("#copylink-dev-settings-host")
    .waitFor({ state: "attached" });
  const markdown = `[#123 Add search filters](${url})`;
  const oldPayload = await copyWithShortcut(
    otherPage,
    `${shortcutModifier}+Shift+l`,
    markdown,
    "リンクをクリップボードにコピーしました",
  );
  expect(oldPayload["text/html"]).not.toContain(":draft_pull_request:");
  await copyWithShortcut(
    page,
    `${shortcutModifier}+t`,
    "#123 Add search filters",
    "タイトルをクリップボードにコピーしました",
  );
  await page.getByRole("button", { name: "設定", exact: true }).last().click();
  const panel = page.locator("#copylink-dev-settings");

  // When: Settings with a custom Draft PR emoji are imported.
  await panel.locator("#importButton").click();
  await panel.locator("#importTextarea").fill(
    JSON.stringify({
      emojiNames: {
        ...DEFAULT_EMOJI_NAMES,
        githubDraftPullRequest: ":draft_pull_request:",
      },
      customRegexes: {
        customRegex1: "",
        customRegex2: "",
        customRegex3: "",
        customRegex4: "",
        customRegex5: "",
      },
    }),
  );
  await panel.locator("#importConfirmButton").click();

  // Then: The Draft override is reflected in the settings form.
  await expect(panel.locator("#importMessage")).toHaveText(
    "設定をインポートしました",
  );
  await expect(panel.locator("#githubDraftPullRequest")).toHaveValue(
    ":draft_pull_request:",
  );
  await panel.getByRole("button", { name: "×", exact: true }).click();

  for (const target of [page, otherPage]) {
    // When: A Slack link is copied in either tab without reloading it.
    const payload = await copyWithShortcut(
      target,
      `${shortcutModifier}+Shift+l`,
      markdown,
      "リンクをクリップボードにコピーしました",
    );

    // Then: The copied HTML uses the imported Draft PR emoji.
    expect(payload["text/html"]).toContain(":draft_pull_request:");
  }
  await otherPage.close();
});

test("the main Save button imports pasted JSON and saves other form edits", async ({
  page,
  gmStorage,
  shortcutModifier,
}) => {
  // Given: JSON is pasted while other settings have unsaved edits.
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  await panel.locator("#sheets-range-format").selectOption("markdown");
  await panel.locator("#importButton").click();
  await panel.locator("#importTextarea").fill(
    JSON.stringify({
      emojiNames: {
        githubDraftPullRequest: ":draft_pull_request:",
        customWebsite1: ":imported:",
      },
      customRegexes: { customRegex1: "copylink-e2e\\.test" },
    }),
  );

  // When: The main Save button is clicked instead of the import confirmation.
  await panel.getByRole("button", { name: "保存", exact: true }).click();

  // Then: The import and other form edits are saved and the panel closes.
  await expect(panel).toBeHidden();
  expect(gmStorage.get("emojiNames")).toMatchObject({
    githubDraftPullRequest: ":draft_pull_request:",
  });
  expect(gmStorage.get("sheetsRangeFormat")).toBe("markdown");
  const payload = await copyWithShortcut(
    page,
    `${shortcutModifier}+Shift+l`,
    `[${fixtureMarkdownTitle}](${page.url()})`,
    "リンクをクリップボードにコピーしました",
  );
  expect(payload["text/html"]).toContain(":imported:");
});

test("the main Save button rejects invalid import JSON before saving any edits", async ({
  page,
  gmStorage,
  shortcutModifier,
}) => {
  // Given: An unsaved emoji edit and invalid import JSON are in the settings panel.
  gmStorage.set("emojiNames", { github: ":saved:" });
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  await panel.locator("#github").fill(":unsaved:");
  await panel.locator("#importButton").click();
  await panel.locator("#importTextarea").fill("{");

  // When: The main Save button is clicked.
  await panel.getByRole("button", { name: "保存", exact: true }).click();

  // Then: The import error is shown and storage remains unchanged.
  await expect(panel).toBeVisible();
  await expect(panel.locator("#importTextarea")).toBeFocused();
  await expect(panel.locator("#importErrorMessage")).toContainText(
    "インポートに失敗しました",
  );
  expect(gmStorage.get("emojiNames")).toEqual({ github: ":saved:" });
  expect(gmStorage.has("userShortcuts")).toBe(false);
  await expect(
    panel.getByRole("button", { name: "保存", exact: true }),
  ).toBeEnabled();
});

test("partial imports reset supplied sections and preserve omitted sections", async ({
  page,
  gmStorage,
  shortcutModifier,
}) => {
  // Given: Both sections have saved overrides and the emoji field has an unsaved edit.
  gmStorage.set("emojiNames", { github: ":saved:" });
  gmStorage.set("customRegexes", { customRegex1: "old" });
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  await panel.locator("#github").fill(":unsaved:");
  await panel.locator("#importButton").click();

  // When: Only the regex section is imported as an empty object.
  await panel.locator("#importTextarea").fill('{"customRegexes":{}}');
  await panel.locator("#importConfirmButton").click();

  // Then: Saved regexes reset while saved and edited emoji values are preserved.
  await expect(panel.locator("#importMessage")).toHaveText(
    "設定をインポートしました",
  );
  expect(gmStorage.get("customRegexes")).toEqual({});
  expect(gmStorage.get("emojiNames")).toEqual({ github: ":saved:" });
  await expect(panel.locator("#customRegex1")).toHaveValue("");
  await expect(panel.locator("#github")).toHaveValue(":unsaved:");

  // When: Only the emoji section is reset after an unsaved regex edit.
  await panel.locator("#customRegex1").fill("unsaved");
  await panel.locator("#importTextarea").fill('{"emojiNames":{}}');
  await panel.locator("#importConfirmButton").click();

  // Then: Emoji defaults return and the omitted regex section keeps its edit.
  await expect(panel.locator("#github")).toHaveValue(":github:");
  await expect(panel.locator("#githubOpenPullRequest")).toHaveValue("");
  expect(gmStorage.get("emojiNames")).not.toHaveProperty(
    "githubOpenPullRequest",
  );
  await expect(panel.locator("#customRegex1")).toHaveValue("unsaved");
  expect(gmStorage.get("customRegexes")).toEqual({});
});

test("invalid imports preserve saved settings and form edits, then allow correction", async ({
  page,
  gmStorage,
  shortcutModifier,
}) => {
  // Given: Saved settings and unsaved edits are present in the settings panel.
  gmStorage.set("emojiNames", { github: ":saved:" });
  gmStorage.set("customRegexes", { customRegex1: "old" });
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  await panel.locator("#github").fill(":unsaved:");
  await panel.locator("#importButton").click();
  for (const text of [
    "{",
    "{}",
    '{"emojiNames":{"github":42}}',
    '{"emojiNames":{"github":"valid"},"customRegexes":{"customRegex1":"["}}',
  ]) {
    // When: Invalid JSON, a malformed section, or an invalid regex is imported.
    await panel.locator("#importTextarea").fill(text);
    await panel.locator("#importConfirmButton").click();

    // Then: The error is associated with the textarea and no settings are changed.
    await expect(panel.locator("#importErrorMessage")).toContainText(
      "インポートに失敗しました",
    );
    await expect(panel.locator("#importTextarea")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(panel.locator("#importTextarea")).toBeFocused();
    await expect(panel.locator("#github")).toHaveValue(":unsaved:");
    expect(gmStorage.get("emojiNames")).toEqual({ github: ":saved:" });
    expect(gmStorage.get("customRegexes")).toEqual({ customRegex1: "old" });
  }

  // When: The JSON is corrected and imported again.
  await panel
    .locator("#importTextarea")
    .fill('{"customRegexes":{"customRegex1":"valid"}}');
  await expect(panel.locator("#importErrorMessage")).toBeEmpty();
  await panel.locator("#importConfirmButton").click();

  // Then: The import succeeds and clears the validation error.
  await expect(panel.locator("#importMessage")).toHaveText(
    "設定をインポートしました",
  );
  await expect(panel.locator("#importTextarea")).not.toHaveAttribute(
    "aria-invalid",
  );
  expect(gmStorage.get("customRegexes")).toEqual({ customRegex1: "valid" });
});

test("export reports clipboard and storage failures", async ({
  page,
  shortcutModifier,
}) => {
  // Given: Settings are open and both clipboard copy methods fail.
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("Clipboard unavailable")),
    });
    // oxlint-disable-next-line no-deprecated -- Simulate failure of the clipboard fallback.
    document.execCommand = () => false;
  });

  // When: Export is attempted.
  await panel.locator("#exportButton").click();

  // Then: Failure is reported and the export button can be used again.
  await expect(panel.locator("#exportMessage")).toContainText(
    "エクスポートに失敗しました",
  );
  await expect(panel.locator("#exportButton")).toBeEnabled();

  // When: Storage reads fail on a subsequent export attempt.
  await page.evaluate(() => {
    Object.defineProperty(globalThis, "GM", {
      value: {
        getValue: () => Promise.reject(new Error("Storage unavailable")),
      },
    });
  });
  await panel.locator("#exportButton").click();

  // Then: The asynchronous storage failure is reported without an unhandled error.
  await expect(panel.locator("#exportMessage")).toContainText(
    "エクスポートに失敗しました",
  );
  await expect(panel.locator("#exportButton")).toBeEnabled();
});
