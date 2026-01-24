import { getFormattedTitle } from "@copylink-dev/scripts/getFormattedTitle";
import { getGoogleSheetsRangeInfo } from "@copylink-dev/scripts/getGoogleSheetsRangeLink";
import {
  copyTextLinkCore,
  type CopyTextLinkDeps,
} from "@copylink-dev/shared/clipboard/copyTextLinkCore";
import { copyToClipboardShared } from "@copylink-dev/shared/clipboard/copyToClipboardShared";
import type { Command } from "@copylink-dev/types/types";
import { getMessage } from "./i18n";
import { showToast, type ToastOptions } from "./toast";
import { getEmojiName } from "./emoji";
import { initSettingsUI } from "./settings-ui";
import { registerShortcuts } from "./shortcuts";
import { defaultShortcuts } from "./constants";
import type { SettingsController } from "./types";

let settingsController: SettingsController | null = null;
let shortcutControllerRef: { refresh: () => Promise<void> } | null = null;

const ensureSettingsController = async () => {
  if (settingsController) return settingsController;
  settingsController = await initSettingsUI(defaultShortcuts, () =>
    shortcutControllerRef?.refresh(),
  );
  return settingsController;
};

const toastWithSettings = (): ToastOptions => ({
  actionLabel: getMessage("settingsButton"),
  onAction: () => {
    ensureSettingsController().then((controller) => controller.show());
  },
});

const buildDeps = (): CopyTextLinkDeps => ({
  t: getMessage,
  getEmojiName,
  getFormattedTitle,
  getGoogleSheetsRangeInfo,
  getUrl: () => document.location.href,
  notify: (message: string) => showToast(message, toastWithSettings()),
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

init();
