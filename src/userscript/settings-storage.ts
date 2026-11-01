import type {
  CustomRegexes,
  EmojiNameRecord,
  LinkFormat,
} from "@copylink-dev/types/types";
import type { ShortcutMap } from "./types";
import { isSheetsRangeFormat } from "./settings-ui-config";

export type SettingsValues = {
  emojiNames: Partial<EmojiNameRecord>;
  customRegexes: Partial<CustomRegexes>;
  userShortcuts: ShortcutMap;
  sheetsRangeFormat: LinkFormat;
};

/**
 * Read the emoji settings used for copying and exporting.
 * @returns The stored emoji names and custom regexes.
 */
export const getEmojiSettings = async () => {
  const [emojiNames, customRegexes] = await Promise.all([
    GM.getValue<SettingsValues["emojiNames"]>("emojiNames", {}),
    GM.getValue<SettingsValues["customRegexes"]>("customRegexes", {}),
  ]);
  return { emojiNames, customRegexes };
};

/**
 * Read the shortcut overrides for keyboard event handling.
 * @returns The stored shortcut overrides.
 */
export const getUserShortcuts = () =>
  GM.getValue<ShortcutMap>("userShortcuts", {});

/**
 * Read the current Sheets range format, falling back to the default.
 * @returns The effective Sheets range format.
 */
export const getSheetsRangeFormat = async (): Promise<LinkFormat> => {
  const stored: unknown = await GM.getValue(
    "sheetsRangeFormat",
    "htmlWithEmoji",
  );
  return isSheetsRangeFormat(stored) ? stored : "htmlWithEmoji";
};

/**
 * Read all settings for the settings panel.
 * @returns The current settings.
 */
export const getSettings = async (): Promise<SettingsValues> => {
  const [emoji, userShortcuts, sheetsRangeFormat] = await Promise.all([
    getEmojiSettings(),
    getUserShortcuts(),
    getSheetsRangeFormat(),
  ]);
  return { ...emoji, userShortcuts, sheetsRangeFormat };
};

export class SettingsStorageError extends Error {
  readonly cause: unknown;
  readonly rollbackFailed: boolean;

  constructor(cause: unknown, rollbackFailed: boolean) {
    super("Failed to save settings");
    this.name = "SettingsStorageError";
    this.cause = cause;
    this.rollbackFailed = rollbackFailed;
  }
}

let pendingSave: Promise<void> = Promise.resolve();

const writeSettings = async (values: Record<string, unknown>) => {
  const entries = Object.entries(values);
  let previous = new Map<string, unknown>();
  const attempted: Array<string> = [];
  try {
    previous = new Map(
      await Promise.all(
        entries.map(
          async ([key]) => [key, await GM.getValue<unknown>(key)] as const,
        ),
      ),
    );
    for (const [key, value] of entries) {
      // A rejected write may still have reached storage, so restore this key too.
      attempted.push(key);
      await GM.setValue(key, value);
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const key of attempted.reverse()) {
      try {
        const value = previous.get(key);
        if (value === undefined) {
          await GM.deleteValue(key);
        } else {
          await GM.setValue(key, value);
        }
      } catch {
        // Keep restoring the remaining keys even if one restoration fails.
        rollbackFailed = true;
      }
    }
    throw new SettingsStorageError(error, rollbackFailed);
  }
};

/**
 * Save a settings batch, restoring its original values if any write fails.
 *
 * @param values Validated settings to persist.
 * @returns Completion of the save or a SettingsStorageError on failure.
 */
export const saveStoredSettings = (
  values: Record<string, unknown>,
): Promise<void> => {
  const save = pendingSave.then(() => writeSettings(values));
  // Serialize saves from this page without letting a failed save block retries.
  pendingSave = save.catch(() => {
    // The caller receives the original rejection; the queue can accept retries.
  });
  return save;
};
