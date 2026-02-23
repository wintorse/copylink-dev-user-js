import {
  type CopyTextLinkDeps,
  copyTextLinkCore,
} from "@copylink-dev/shared/clipboard/copyTextLinkCore";
import { type MessageId, getMessage, i18nMessages } from "./i18n";
import { type ToastOptions, showToast } from "./toast";
import type { Command } from "@copylink-dev/types/types";
import type { SettingsController } from "./types";
import { copyToClipboardShared } from "@copylink-dev/shared/clipboard/copyToClipboardShared";
import { defaultShortcuts } from "./constants";
import { getEmojiName } from "./emoji";
import { getFormattedTitle } from "@copylink-dev/shared/getFormattedTitle";
import { getGoogleSheetsRangeInfo } from "@copylink-dev/shared/getGoogleSheetsRangeLink";
import { initSettingsUI } from "./settings-ui";
import { registerShortcuts } from "./shortcuts";

let settingsController: SettingsController | null = null;
let shortcutControllerRef: { refresh: () => Promise<void> } | null = null;

/**
 * Create settings controller lazily and return the singleton instance.
 *
 * @returns Settings controller instance.
 */
const ensureSettingsController = async () => {
  if (settingsController) {
    return settingsController;
  }
  settingsController = await initSettingsUI(defaultShortcuts, () => {
    if (shortcutControllerRef) {
      shortcutControllerRef.refresh().catch(console.error);
    }
  });
  return settingsController;
};

/**
 * Build toast options with a shortcut to open settings.
 *
 * @returns Toast options including a settings action.
 */
const toastWithSettings = (): ToastOptions => ({
  actionLabel: getMessage("settingsButton"),
  onAction: () => {
    ensureSettingsController()
      .then((controller) => controller.show())
      .catch(console.error);
  },
});

const isMessageId = (key: string): key is MessageId => key in i18nMessages.en;

/**
 * Build dependency object consumed by shared copy handlers.
 *
 * @returns Dependency object for `copyTextLinkCore`.
 */
const buildDeps = (): CopyTextLinkDeps => ({
  t: (key: string) => (isMessageId(key) ? getMessage(key) : key),
  getEmojiName,
  getFormattedTitle,
  getGoogleSheetsRangeInfo,
  getUrl: () => document.location.href,
  notify: async (message: string) =>
    await showToast(message, toastWithSettings()),
  copy: (text, html, fallbackElement) =>
    copyToClipboardShared(text, html, fallbackElement),
});

const copyHandlers: Record<Command, () => Promise<void>> = {
  "copy-link": () => copyTextLinkCore("copy-link", buildDeps()),
  "copy-link-for-slack": () =>
    copyTextLinkCore("copy-link-for-slack", buildDeps()),
  "copy-title": () => copyTextLinkCore("copy-title", buildDeps()),
  "copy-google-sheets-range": () =>
    copyTextLinkCore("copy-google-sheets-range", buildDeps()),
};

const init = async () => {
  const shortcutController = await registerShortcuts(
    defaultShortcuts,
    copyHandlers,
  );
  shortcutControllerRef = shortcutController;
  await ensureSettingsController();
};

init().catch(console.error);
