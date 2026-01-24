import { getFormattedTitle } from "@copylink-dev/scripts/getFormattedTitle";
import { getGoogleSheetsRangeInfo } from "@copylink-dev/scripts/getGoogleSheetsRangeLink";
import type { Command } from "@copylink-dev/types/types";
import { getMessage } from "./i18n";
import { showToast, type ToastOptions } from "./toast";
import { getEmojiName } from "./emoji";
import { initSettingsUI, type SettingsController } from "./settings-ui";
import { registerShortcuts, type ShortcutMap } from "./shortcuts";

export const isMac = /Mac/.test(navigator.userAgent);

const defaultShortcuts: ShortcutMap = isMac
  ? {
      "copy-link": {
        key: "l",
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
      },
      "copy-link-for-slack": {
        key: "l",
        ctrl: true,
        shift: true,
        alt: false,
        meta: false,
      },
      "copy-title": {
        key: "t",
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
      },
      "copy-google-sheets-range": {
        key: "r",
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
      },
    }
  : {
      "copy-link": {
        key: "l",
        ctrl: false,
        shift: false,
        alt: true,
        meta: false,
      },
      "copy-link-for-slack": {
        key: "l",
        ctrl: false,
        shift: true,
        alt: true,
        meta: false,
      },
      "copy-title": {
        key: "t",
        ctrl: false,
        shift: false,
        alt: true,
        meta: false,
      },
      "copy-google-sheets-range": {
        key: "r",
        ctrl: false,
        shift: false,
        alt: true,
        meta: false,
      },
    };

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

const copyToClipboard = async (
  text: string,
  successMessage: string,
  failureMessage: string,
  html?: string,
  toastOptions?: ToastOptions,
  fallbackElement?: HTMLElement,
) => {
  try {
    if (navigator.clipboard) {
      if (html) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
    } else if (fallbackElement) {
      document.body.appendChild(fallbackElement);
      const range = document.createRange();
      range.selectNode(fallbackElement);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();
      }
      document.body.removeChild(fallbackElement);
    } else {
      throw new Error("Clipboard not available");
    }
    showToast(successMessage, toastOptions);
    return true;
  } catch (error) {
    console.warn(error);
    showToast(failureMessage, toastOptions);
    return false;
  }
};

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
