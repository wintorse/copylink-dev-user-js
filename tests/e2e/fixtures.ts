import {
  type Locator,
  type Page,
  test as base,
  expect,
} from "@playwright/test";
import { readFile } from "node:fs/promises";

export { expect } from "@playwright/test";

export const fixtureOrigin = "https://copylink-e2e.test";
export const fixtureTitle = 'Copylink E2E & <Test> "日本語"';
export const fixtureMarkdownTitle = 'Copylink E2E \\& \\<Test\\> "日本語"';

type Fixtures = {
  gmStorage: Map<string, unknown>;
  shortcutModifier: "Control" | "Alt";
};

export const test = base.extend<Fixtures>({
  // oxlint-disable-next-line no-empty-pattern -- Playwright requires fixture dependencies to be destructured.
  gmStorage: async ({}, use) => {
    await use(new Map<string, unknown>());
  },
  page: async ({ page, context, gmStorage }, use) => {
    const errors: Array<string> = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });

    // Store values outside the page so they survive reloads and are shared by frames.
    await context.exposeBinding(
      "__e2eGMGet",
      (_source, key: string, fallback: unknown) =>
        structuredClone(gmStorage.has(key) ? gmStorage.get(key) : fallback),
    );
    await context.exposeBinding(
      "__e2eGMSet",
      (_source, key: string, value: unknown) => {
        gmStorage.set(key, structuredClone(value));
      },
    );
    const bundle = await readFile(
      new URL("../../dist/copylink-dev.user.js", import.meta.url),
      "utf8",
    );
    // Install the GM mock and bundle together to guarantee their execution order.
    // Run at DOMContentLoaded to approximate a userscript manager's document-end timing.
    await context.addInitScript({
      content: `
        globalThis.GM = {
          getValue: (key, fallback) => globalThis.__e2eGMGet(key, fallback),
          setValue: (key, value) => globalThis.__e2eGMSet(key, value),
        };
        document.addEventListener('DOMContentLoaded', () => {
          ${bundle}
        }, { once: true });
      `,
    });

    const html = await readFile(
      new URL("./fixtures/index.html", import.meta.url),
      "utf8",
    );
    const frameHtml = await readFile(
      new URL("./fixtures/frame.html", import.meta.url),
      "utf8",
    );
    // Fulfill fixture requests locally; tests do not depend on a server or public sites.
    await context.route(`${fixtureOrigin}/**`, async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname.endsWith(".xml")) {
        await route.fulfill({
          contentType: "application/xml",
          body: '<?xml version="1.0"?><feed><title>XML fixture</title></feed>',
        });
        return;
      }
      await route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: pathname === "/frame.html" ? frameHtml : html,
      });
    });

    await use(page);
    expect(errors, "No page or console errors").toEqual([]);
  },
  shortcutModifier: async ({ page }, use) => {
    const isMac = await page.evaluate(() => /Mac/.test(navigator.userAgent));
    await use(isMac ? "Control" : "Alt");
  },
});

export const gotoFixture = async (page: Page) => {
  await page.goto(fixtureOrigin);
  await page
    .locator("#copylink-dev-settings-host")
    .waitFor({ state: "attached" });
};

export const readClipboard = async (page: Page) => {
  await page.bringToFront();
  return page.evaluate(async () => {
    const payload: Record<string, string> = {};
    for (const item of await navigator.clipboard.read()) {
      for (const type of item.types) {
        payload[type] = await (await item.getType(type)).text();
      }
    }
    return payload;
  });
};

export const copyWithShortcut = async (
  page: Page,
  shortcut: string,
  expectedText: string,
  successMessage: string,
  target?: Locator,
) => {
  await page.bringToFront();
  await page.evaluate(() => navigator.clipboard.writeText("e2e sentinel"));
  if (target) {
    await target.press(shortcut);
  } else {
    await page.keyboard.press(shortcut);
  }
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => navigator.clipboard.readText());
      } catch (error) {
        // Chromium can invalidate a read while a clipboard write is in progress.
        if (String(error).includes("InvalidStateError")) {
          return null;
        }
        throw error;
      }
    })
    .toBe(expectedText);
  await expect(page.locator(".copylink-dev-toast").last()).toContainText(
    successMessage,
  );
  return readClipboard(page);
};

export const openSettings = async (page: Page, shortcut: string) => {
  await copyWithShortcut(
    page,
    shortcut,
    fixtureTitle,
    "タイトルをクリップボードにコピーしました",
  );
  await page.getByRole("button", { name: "設定", exact: true }).last().click();
  await expect(page.locator("#copylink-dev-settings")).toBeVisible();
};
