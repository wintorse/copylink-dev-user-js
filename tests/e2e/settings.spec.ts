import {
  copyWithShortcut,
  expect,
  gotoFixture,
  openSettings,
  test,
} from "./fixtures";

test("blank PR status emojis inherit the common emoji after saving and reloading", async ({
  page,
  gmStorage,
  shortcutModifier,
}) => {
  // Given: A common PR emoji and an explicit merged-state override are saved.
  gmStorage.set("emojiNames", {
    githubPullRequest: ":old:",
    githubMergedPullRequest: ":merged:",
  });
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  const statusKeys = [
    "githubDraftPullRequest",
    "githubOpenPullRequest",
    "githubMergedPullRequest",
    "githubClosedPullRequest",
  ];
  await expect(panel.locator("#githubMergedPullRequest")).toHaveValue(
    ":merged:",
  );
  await expect(panel.locator("#githubOpenPullRequest")).toHaveValue("");
  await expect(panel.locator("#githubOpenPullRequest")).toHaveAttribute(
    "placeholder",
    ":old:",
  );

  // When: The common emoji is edited and the merged override is cleared.
  await panel.locator("#githubPullRequest").fill("new");
  await panel.locator("#githubMergedPullRequest").fill("");
  for (const key of statusKeys) {
    await expect(panel.locator(`#${key}`)).toHaveAttribute(
      "placeholder",
      ":new:",
    );
  }
  await panel.getByRole("button", { name: "保存", exact: true }).click();
  await expect(panel).toBeHidden();

  // Then: Unset status values stay absent from storage instead of becoming defaults.
  expect(gmStorage.get("emojiNames")).toMatchObject({
    githubPullRequest: ":new:",
  });
  for (const key of statusKeys) {
    expect(gmStorage.get("emojiNames")).not.toHaveProperty(key);
  }

  // When: Settings are reopened after a reload and an open-state override is saved.
  await page.reload();
  await page
    .locator("#copylink-dev-settings-host")
    .waitFor({ state: "attached" });
  await openSettings(page, `${shortcutModifier}+t`);
  for (const key of statusKeys) {
    await expect(panel.locator(`#${key}`)).toHaveValue("");
    await expect(panel.locator(`#${key}`)).toHaveAttribute(
      "placeholder",
      ":new:",
    );
  }
  await panel.locator("#githubOpenPullRequest").fill(":custom_open:");
  await panel.getByRole("button", { name: "保存", exact: true }).click();
  await expect(panel).toBeHidden();

  // Then: A real PR context uses inheritance for merged PRs and the override for open PRs.
  const url = "https://github.com/a/b/pull/1";
  await page.route(url, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html><head><title>PR title</title></head><body><header><span data-status="pullMerged"></span></header><h1><span>PR title</span></h1></body></html>',
    }),
  );
  await page.goto(url);
  await page
    .locator("#copylink-dev-settings-host")
    .waitFor({ state: "attached" });
  for (const { status, emoji } of [
    { status: "pullMerged", emoji: ":new:" },
    { status: "pullOpened", emoji: ":custom_open:" },
  ]) {
    await page.locator("header [data-status]").evaluate((element, value) => {
      element.setAttribute("data-status", value);
    }, status);
    const payload = await copyWithShortcut(
      page,
      `${shortcutModifier}+Shift+l`,
      `[#1 PR title](${url})`,
      "リンクをクリップボードにコピーしました",
    );
    expect(payload["text/html"]).toContain(emoji);
  }
});

test("invalid custom regexes show an error and prevent partial settings saves", async ({
  page,
  gmStorage,
  shortcutModifier,
}, testInfo) => {
  // Given: A valid regex is already saved.
  gmStorage.set("customRegexes", { customRegex1: "old" });
  await gotoFixture(page);
  await openSettings(page, `${shortcutModifier}+t`);
  const panel = page.locator("#copylink-dev-settings");
  const regex = panel.locator("#customRegex1");
  const error = panel.locator("#customRegex1-error");

  // When: An invalid regex and other settings changes are submitted.
  await regex.fill("[");
  await panel.locator("#customRegex2").fill("sibling");
  await panel.locator("#githubPullRequest").fill(":changed:");
  await panel.getByRole("button", { name: "保存", exact: true }).click();

  // Then: The error stays visible and no settings have been partially written.
  await expect(panel).toBeVisible();
  await expect(regex).toBeFocused();
  await expect(regex).toHaveAttribute("aria-invalid", "true");
  await expect(error).toHaveText("正規表現が正しくありません");
  await expect(error).toBeVisible();
  expect(gmStorage.get("customRegexes")).toEqual({ customRegex1: "old" });
  expect(gmStorage.has("emojiNames")).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("regex-validation.png") });

  // When: The regex is corrected and settings are saved again.
  await regex.fill("valid");
  await expect(regex).toHaveAttribute("aria-invalid", "false");
  await expect(error).toBeEmpty();
  await panel.getByRole("button", { name: "保存", exact: true }).click();

  // Then: All valid changes are persisted.
  await expect(panel).toBeHidden();
  expect(gmStorage.get("customRegexes")).toMatchObject({
    customRegex1: "valid",
    customRegex2: "sibling",
  });
  expect(gmStorage.get("emojiNames")).toMatchObject({
    githubPullRequest: ":changed:",
  });

  // When: An invalid edit is cancelled and settings are reopened.
  await openSettings(page, `${shortcutModifier}+t`);
  await regex.fill("[");
  await panel.getByRole("button", { name: "×", exact: true }).click();
  await openSettings(page, `${shortcutModifier}+t`);

  // Then: The saved valid value is restored and its old error is cleared.
  await expect(regex).toHaveValue("valid");
  await expect(regex).toHaveAttribute("aria-invalid", "false");
  await expect(error).toBeEmpty();
});
