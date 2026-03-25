import {
  CUSTOM_REGEX_KEYS,
  DEFAULT_EMOJI_NAMES,
  EMOJI_KEYS,
} from "@copylink-dev/shared/constants";
import { SheetsRangeFormatSelectId, formatShortcut } from "./settings-ui-dom";
import {
  getCachedCustomRegexes,
  getCachedEmojiNames,
  getCachedSheetsRangeFormat,
  getUserShortcuts,
  refreshSettingsCache,
  updateCustomRegex,
  updateEmojiName,
  updateSheetsRangeFormat,
  updateShortcut,
} from "./cache";
import {
  isCustomRegexKey,
  isEmojiKey,
  isShortcut,
  shortcutCommands,
} from "./settings-ui-config";
import type { ShortcutMap } from "./types";
import { getMessage } from "./i18n";
import { normalizeEmojiValue } from "@copylink-dev/shared/popup/emojiSettings";
import { showToast } from "./toast";

/**
 * Apply cached settings values to form fields.
 *
 * @param panelShadowRoot ShadowRoot of the settings panel.
 * @param defaultsRef Default shortcut definitions.
 * @returns Nothing.
 */
export const loadSettings = (
  panelShadowRoot: ShadowRoot | null,
  defaultsRef: ShortcutMap | null,
) => {
  if (!panelShadowRoot || !defaultsRef) {
    return;
  }

  const root = panelShadowRoot;
  const userShortcuts = getUserShortcuts();

  shortcutCommands.forEach(({ key }) => {
    const input = root.querySelector<HTMLInputElement>(`#shortcut-${key}`);
    const effective = userShortcuts[key] ?? defaultsRef[key];
    if (input && effective !== undefined) {
      input.value = formatShortcut(effective);
      input.dataset.shortcut = JSON.stringify(effective);
    }
  });

  const emojiNames = getCachedEmojiNames();
  EMOJI_KEYS.forEach((key) => {
    const input = root.querySelector<HTMLInputElement>(`#${key}`);
    if (!input) {
      return;
    }
    input.value = emojiNames[key];
    input.placeholder = DEFAULT_EMOJI_NAMES[key];
  });

  const regexes = getCachedCustomRegexes();
  CUSTOM_REGEX_KEYS.forEach((key, idx) => {
    const input = root.querySelector<HTMLInputElement>(
      `#customRegex${idx + 1}`,
    );
    if (input) {
      input.value = regexes[key] ?? "";
    }
  });

  const formatSelect = root.querySelector<HTMLSelectElement>(
    `#${SheetsRangeFormatSelectId}`,
  );
  if (formatSelect) {
    formatSelect.value = getCachedSheetsRangeFormat();
  }
};

type SaveSettingsParams = {
  panelShadowRoot: ShadowRoot | null;
  defaultsRef: ShortcutMap | null;
  hidePanel: () => void;
  onSaved?: () => void;
};

/**
 * Persist form inputs, then refresh cache and show completion feedback.
 *
 * @param params Dependency object required for saving.
 * @param params.panelShadowRoot ShadowRoot of the settings panel.
 * @param params.defaultsRef Default shortcut definitions.
 * @param params.hidePanel Function to close the panel after save.
 * @param params.onSaved Optional callback invoked after save completes.
 * @returns Nothing.
 */
export const saveSettings = async ({
  panelShadowRoot,
  defaultsRef,
  hidePanel,
  onSaved,
}: SaveSettingsParams) => {
  if (!panelShadowRoot || !defaultsRef) {
    return;
  }
  const root = panelShadowRoot;

  // Note: The form fields are not controlled components, so we read values directly from the DOM on save.
  const emojiInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-emoji-key]"),
  );
  const regexInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-regex-key]"),
  );
  const shortcutInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-command-key]"),
  );

  // Process emoji name inputs.
  for (const input of emojiInputs) {
    const emojiKey = input.dataset.emojiKey;
    if (!isEmojiKey(emojiKey)) {
      continue;
    }
    const normalized = normalizeEmojiValue(
      input.value,
      DEFAULT_EMOJI_NAMES[emojiKey],
    );
    await updateEmojiName(emojiKey, normalized);
  }

  // Process custom regex inputs.
  for (const input of regexInputs) {
    const regexKey = input.dataset.regexKey;
    if (!isCustomRegexKey(regexKey)) {
      continue;
    }
    await updateCustomRegex(regexKey, input.value || "");
  }

  // Process shortcut inputs.
  for (const input of shortcutInputs) {
    const commandKey = input.dataset.commandKey ?? "";
    const parsed =
      input.dataset.shortcut !== undefined && input.dataset.shortcut !== ""
        ? (() => {
            const p: unknown = JSON.parse(input.dataset.shortcut ?? "");
            return isShortcut(p) ? p : null;
          })()
        : defaultsRef[commandKey];
    if (parsed !== null && parsed !== undefined) {
      await updateShortcut(commandKey, parsed);
    }
  }

  // Process sheets range format selection.
  const formatSelect = root.querySelector<HTMLSelectElement>(
    `#${SheetsRangeFormatSelectId}`,
  );
  if (formatSelect) {
    const value = formatSelect.value;
    if (
      value === "html" ||
      value === "htmlWithEmoji" ||
      value === "markdown" ||
      value === "plainUrl"
    ) {
      await updateSheetsRangeFormat(value);
    }
  }

  await refreshSettingsCache();
  await showToast(getMessage("settingsSaved"));
  hidePanel();
  onSaved?.();
};
