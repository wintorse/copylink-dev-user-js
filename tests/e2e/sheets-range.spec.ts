import {
  copyWithShortcut,
  expect,
  gotoFixture,
  openSettings,
  test,
} from "./fixtures";

const sheetsUrl = "https://docs.google.com/spreadsheets/d/example/edit#gid=42";
const rangeUrl = `${sheetsUrl}&range=B2:C4`;
const title = "Quarterly report";

test.beforeEach(async ({ page }) => {
  // Given: A Sheets page has a title and a selected range.
  await page.route("https://docs.google.com/spreadsheets/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html lang="ja"><head><title>Spreadsheet</title></head><body><div id="docs-title-widget"><input value="${title}"></div><input id="t-name-box" value="B2:C4"></body></html>`,
    }),
  );
  await page.goto(sheetsUrl);
  await page
    .locator("#copylink-dev-settings-host")
    .waitFor({ state: "attached" });
});

test("Sheets range shortcut uses each saved format", async ({
  page,
  shortcutModifier,
}) => {
  for (const { format, text, html, emoji } of [
    {
      format: "htmlWithEmoji",
      text: `[${title}](${rangeUrl})`,
      html: true,
      emoji: true,
    },
    { format: "html", text: title, html: true, emoji: false },
    {
      format: "markdown",
      text: `[${title}](${rangeUrl})`,
      html: false,
      emoji: false,
    },
    { format: "plainUrl", text: rangeUrl, html: false, emoji: false },
  ]) {
    // Given: The output format is saved in the userscript settings.
    await copyWithShortcut(
      page,
      `${shortcutModifier}+t`,
      title,
      "タイトルをクリップボードにコピーしました",
    );
    await page
      .getByRole("button", { name: "設定", exact: true })
      .last()
      .click();
    const panel = page.locator("#copylink-dev-settings");
    await panel.locator("#sheets-range-format").selectOption(format);
    await panel.getByRole("button", { name: "保存", exact: true }).click();
    await expect(panel).toBeHidden();

    // When: The Sheets range shortcut is pressed.
    const payload = await copyWithShortcut(
      page,
      `${shortcutModifier}+r`,
      text,
      "この範囲のリンクをクリップボードにコピーしました",
    );

    // Then: The clipboard contains the selected format and range link.
    if (!html) {
      expect(payload["text/html"]).toBeUndefined();
      continue;
    }
    const content = await page.evaluate((value) => {
      const doc = new DOMParser().parseFromString(value, "text/html");
      const anchor = doc.querySelector("a");
      return {
        href: anchor?.href,
        title: anchor?.textContent,
        text: doc.body.textContent,
      };
    }, payload["text/html"]);
    expect(content.href).toBe(rangeUrl);
    expect(content.title).toBe(title);
    expect(content.text?.includes(":google_sheets:")).toBe(emoji);
  }
});

test("Sheets range shortcut reports a missing selection without copying", async ({
  page,
  shortcutModifier,
}) => {
  // Given: No range is selected and the clipboard contains a sentinel value.
  await page.locator("#t-name-box").fill("");
  await page.evaluate(() => navigator.clipboard.writeText("unchanged"));

  // When: The Sheets range shortcut is pressed.
  await page.keyboard.press(`${shortcutModifier}+r`);

  // Then: A failure toast appears and the clipboard is unchanged.
  await expect(page.locator(".copylink-dev-toast").last()).toContainText(
    "選択した範囲のリンクのコピーに失敗しました",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "unchanged",
  );
});

test("an open Sheets tab uses a format saved in another tab", async ({
  page,
  context,
  shortcutModifier,
}) => {
  // Given: The open Sheets tab has cached the URL-only format.
  await copyWithShortcut(
    page,
    `${shortcutModifier}+t`,
    title,
    "タイトルをクリップボードにコピーしました",
  );
  await page.getByRole("button", { name: "設定", exact: true }).last().click();
  const sheetsPanel = page.locator("#copylink-dev-settings");
  await sheetsPanel.locator("#sheets-range-format").selectOption("plainUrl");
  await sheetsPanel.getByRole("button", { name: "保存", exact: true }).click();
  await expect(sheetsPanel).toBeHidden();

  // Given: Settings are open in another tab, while the Sheets tab is active.
  const other = await context.newPage();
  await gotoFixture(other);
  await openSettings(other, `${shortcutModifier}+t`);
  await page.bringToFront();

  // When: Another tab saves Markdown without refocusing the Sheets tab.
  await other.evaluate(() => {
    const root = document.getElementById(
      "copylink-dev-settings-host",
    )?.shadowRoot;
    const select = root?.querySelector<HTMLSelectElement>(
      "#sheets-range-format",
    );
    const button = root?.querySelector<HTMLButtonElement>(".save-btn");
    if (!select || !button) {
      throw new Error("Settings controls are missing");
    }
    select.value = "markdown";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    button.click();
  });
  await expect(other.locator("#copylink-dev-settings")).toBeHidden();

  // Then: The first range copy uses the newly saved format.
  const payload = await copyWithShortcut(
    page,
    `${shortcutModifier}+r`,
    `[${title}](${rangeUrl})`,
    "この範囲のリンクをクリップボードにコピーしました",
  );
  expect(payload["text/html"]).toBeUndefined();
});
