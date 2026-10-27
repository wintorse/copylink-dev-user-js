import { expect, gotoFixture, openSettings, test } from "./fixtures";

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
