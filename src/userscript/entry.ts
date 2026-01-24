import { getFormattedTitle } from "@copylink-dev/scripts/getFormattedTitle";
import { getGoogleSheetsRangeInfo } from "@copylink-dev/scripts/getGoogleSheetsRangeLink";
import type { Command } from "@copylink-dev/types/types";
import { getMessage } from "./i18n";
import { showToast, type ToastOptions } from "./toast";
import { getEmojiName } from "./emoji";
import { initSettingsUI } from "./settings-ui";
import { registerShortcuts } from "./shortcuts";
import { defaultShortcuts } from "./constants";
import { copyToClipboard } from "./utils";
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

const copyHandlers: Record<Command, () => Promise<void>> = {
  "copy-link": async () => {
    const title = getFormattedTitle();
    const url = document.location.href;
    const html = `<a href="${url}">${title}</a>&nbsp;`;
    const fallbackElement = document.createElement("span");
    const anchor = document.createElement("a");
    anchor.setAttribute("href", url);
    anchor.textContent = title;
    fallbackElement.appendChild(anchor);
    fallbackElement.appendChild(document.createTextNode(" "));
    const toastOptions = toastWithSettings();
    await copyToClipboard(
      title,
      getMessage("copyLinkSuccess"),
      getMessage("copyLinkFailure"),
      html,
      toastOptions,
      fallbackElement,
    );
  },
  "copy-link-for-slack": async () => {
    const title = getFormattedTitle();
    const url = document.location.href;
    const emoji = await getEmojiName();
    const text = `${emoji} ${title}`.trim();
    const html = `${emoji}&nbsp;<a href="${url}">${title}</a>&nbsp;`;
    const fallbackElement = document.createElement("span");
    fallbackElement.appendChild(document.createTextNode(`${emoji} `));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", url);
    anchor.textContent = title;
    fallbackElement.appendChild(anchor);
    fallbackElement.appendChild(document.createTextNode(" "));
    const toastOptions = toastWithSettings();
    await copyToClipboard(
      text,
      getMessage("copyLinkSuccess"),
      getMessage("copyLinkFailure"),
      html,
      toastOptions,
      fallbackElement,
    );
  },
  "copy-title": async () => {
    const title = getFormattedTitle();
    const fallbackElement = document.createElement("p");
    fallbackElement.textContent = title;
    const toastOptions = toastWithSettings();
    await copyToClipboard(
      title,
      getMessage("copyTitleSuccess"),
      getMessage("copyTitleFailure"),
      undefined,
      toastOptions,
      fallbackElement,
    );
  },
  "copy-google-sheets-range": async () => {
    const rangeInfo = getGoogleSheetsRangeInfo();
    const toastOptions = toastWithSettings();
    if (!rangeInfo) {
      showToast(getMessage("copyGoogleSheetsRangeFailure"), toastOptions);
      return;
    }
    const emoji = await getEmojiName();
    const linkText = getFormattedTitle();
    const text = `${emoji} ${linkText}`.trim();
    const html = `${emoji}&nbsp;<a href="${rangeInfo.link}">${linkText}</a>&nbsp;`;
    const fallbackElement = document.createElement("span");
    fallbackElement.appendChild(document.createTextNode(`${emoji} `));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", rangeInfo.link);
    anchor.textContent = linkText;
    fallbackElement.appendChild(anchor);
    fallbackElement.appendChild(document.createTextNode(" "));
    await copyToClipboard(
      text,
      getMessage("copyGoogleSheetsRangeSuccess"),
      getMessage("copyGoogleSheetsRangeFailure"),
      html,
      toastOptions,
      fallbackElement,
    );
  },
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
