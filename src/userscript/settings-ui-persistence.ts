import {
  CUSTOM_REGEX_KEYS,
  DEFAULT_EMOJI_NAMES,
  EMOJI_KEYS,
} from "@copylink-dev/shared/constants";
import type { CustomRegexes, EmojiKeys } from "@copylink-dev/types/types";
import {
  type ImportData,
  parseImportedSettings,
} from "@copylink-dev/shared/popup/importSettings";
import {
  SheetsRangeFormatSelectId,
  formatShortcut,
  refreshStatusEmojiPlaceholders,
  validateCustomRegexInput,
} from "./settings-ui-dom";
import {
  buildCustomRegexes,
  buildEmojiNames,
  getInitialEmojiValues,
} from "@copylink-dev/shared/popup/emojiSettings";
import {
  getCachedCustomRegexes,
  getCachedEmojiNames,
  getCachedSheetsRangeFormat,
  getUserShortcuts,
  refreshSettingsCache,
  updateCustomRegexes,
  updateEmojiNames,
  updateSheetsRangeFormat,
  updateShortcut,
} from "./cache";
import {
  isCustomRegexKey,
  isEmojiKey,
  isSheetsRangeFormat,
  isShortcut,
  shortcutCommands,
} from "./settings-ui-config";
import type { ShortcutMap } from "./types";
import { getMessage } from "./i18n";
import { resetSettingsTransferUI } from "./settings-ui-transfer";
import { showToast } from "./toast";

const loadEmojiSettings = (root: ParentNode) => {
  const emojiValues = getInitialEmojiValues(getCachedEmojiNames());
  EMOJI_KEYS.forEach((key) => {
    const input = root.querySelector<HTMLInputElement>(`#${key}`);
    if (!input) {
      return;
    }
    input.value = emojiValues[key];
    input.placeholder = DEFAULT_EMOJI_NAMES[key];
  });
  refreshStatusEmojiPlaceholders(root);
};

const loadCustomRegexSettings = (root: ParentNode) => {
  const regexes = getCachedCustomRegexes();
  CUSTOM_REGEX_KEYS.forEach((key) => {
    const input = root.querySelector<HTMLInputElement>(`#${key}`);
    if (input) {
      input.value = regexes[key] ?? "";
      validateCustomRegexInput(input);
    }
  });
};

/**
 * Validate all imported data before saving and refreshing the supplied sections.
 *
 * @param text Serialized settings from the import field.
 * @param root Settings root containing the fields to refresh.
 */
export const importSettings = async (text: string, root: ParentNode) => {
  const data = parseImportedSettings(text);
  if (data.emojiNames !== undefined) {
    await updateEmojiNames(data.emojiNames);
    loadEmojiSettings(root);
  }
  if (data.customRegexes !== undefined) {
    await updateCustomRegexes(data.customRegexes);
    loadCustomRegexSettings(root);
  }
};

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

  loadEmojiSettings(root);
  loadCustomRegexSettings(root);
  resetSettingsTransferUI(root);

  const formatSelect = root.querySelector<HTMLSelectElement>(
    `#${SheetsRangeFormatSelectId}`,
  );
  if (formatSelect) {
    const cachedFormat = getCachedSheetsRangeFormat();
    const options = Array.from(formatSelect.options);
    const hasCachedOption = options.some(
      (option) => option.value === cachedFormat,
    );
    if (hasCachedOption) {
      formatSelect.value = cachedFormat;
    } else if (options.length > 0) {
      // Fallback to the first available option to avoid a blank selection.
      formatSelect.value = options[0].value;
    }
  }
};

type SaveSettingsParams = {
  importedSettings: ImportData;
  panelShadowRoot: ShadowRoot | null;
  defaultsRef: ShortcutMap | null;
  hidePanel: () => void;
  onSaved?: () => void;
};

/**
 * Validate the combined import and form values, then persist the final settings.
 *
 * @param params Dependency object required for saving.
 * @param params.importedSettings Validated sections that replace matching form values.
 * @param params.panelShadowRoot ShadowRoot of the settings panel.
 * @param params.defaultsRef Default shortcut definitions.
 * @param params.hidePanel Function to close the panel after save.
 * @param params.onSaved Optional callback invoked after save completes.
 * @returns Nothing.
 */
export const saveSettings = async ({
  importedSettings,
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

  // A supplied regex section replaces the entire form section, including invalid edits.
  const invalidRegexInputs =
    importedSettings.customRegexes === undefined
      ? regexInputs.filter((input) => !validateCustomRegexInput(input))
      : [];
  if (invalidRegexInputs.length > 0) {
    invalidRegexInputs[0].focus();
    return;
  }

  // Build a snapshot of every final value before performing any storage writes.
  const emojiValues: Partial<Record<EmojiKeys, string>> = {};
  for (const input of emojiInputs) {
    const emojiKey = input.dataset.emojiKey;
    if (!isEmojiKey(emojiKey)) {
      continue;
    }
    emojiValues[emojiKey] = input.value;
  }
  const emojiNames =
    importedSettings.emojiNames ?? buildEmojiNames(emojiValues);

  const regexValues: Partial<CustomRegexes> = {};
  for (const input of regexInputs) {
    const regexKey = input.dataset.regexKey;
    if (!isCustomRegexKey(regexKey)) {
      continue;
    }
    regexValues[regexKey] = input.value;
  }
  const customRegexes =
    importedSettings.customRegexes ?? buildCustomRegexes(regexValues);

  const shortcuts: ShortcutMap = {};
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
      shortcuts[commandKey] = parsed;
    }
  }

  const formatSelect = root.querySelector<HTMLSelectElement>(
    `#${SheetsRangeFormatSelectId}`,
  );
  const format = formatSelect?.value;

  await updateEmojiNames(emojiNames);
  await updateCustomRegexes(customRegexes);
  for (const [commandKey, shortcut] of Object.entries(shortcuts)) {
    await updateShortcut(commandKey, shortcut);
  }
  if (isSheetsRangeFormat(format)) {
    await updateSheetsRangeFormat(format);
  }

  await refreshSettingsCache();
  await showToast(getMessage("settingsSaved"));
  hidePanel();
  onSaved?.();
};
