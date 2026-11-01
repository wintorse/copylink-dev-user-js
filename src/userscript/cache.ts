import type {
  CustomRegexes,
  EmojiNameRecord,
  LinkFormat,
} from "@copylink-dev/types/types";
import type { CUSTOM_REGEX_KEYS } from "@copylink-dev/shared/constants";
import { isSheetsRangeFormat } from "./settings-ui-config";
import { saveStoredSettings } from "./settings-storage";

export type UserShortcuts = Record<string, ShortcutDefinition>;

export type ShortcutDefinition = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
};

type SettingsValues = {
  emojiNames: Partial<EmojiNameRecord>;
  customRegexes: Partial<CustomRegexes>;
  userShortcuts: UserShortcuts;
  sheetsRangeFormat: LinkFormat;
};

let cachedEmojiNames: Partial<EmojiNameRecord> = {};
let cachedCustomRegexes: Partial<
  Record<(typeof CUSTOM_REGEX_KEYS)[number], string>
> = {};
let cachedUserShortcuts: UserShortcuts = {};
let cachedSheetsRangeFormat: LinkFormat = "htmlWithEmoji";

/**
 * Reload settings from persistent userscript storage into in-memory cache.
 *
 * @returns Nothing.
 */
export const refreshSettingsCache = async () => {
  const [emojiNames, customRegexes, userShortcuts, storedFormat] =
    await Promise.all([
      GM.getValue<SettingsValues["emojiNames"]>("emojiNames", {}),
      GM.getValue<SettingsValues["customRegexes"]>("customRegexes", {}),
      GM.getValue<UserShortcuts>("userShortcuts", {}),
      GM.getValue<unknown>("sheetsRangeFormat", "htmlWithEmoji"),
    ]);
  cachedEmojiNames = emojiNames;
  cachedCustomRegexes = customRegexes;
  cachedUserShortcuts = userShortcuts;
  cachedSheetsRangeFormat = isSheetsRangeFormat(storedFormat)
    ? storedFormat
    : "htmlWithEmoji";
};

export const getCachedEmojiNames = () => cachedEmojiNames;
export const getCachedCustomRegexes = () => cachedCustomRegexes;
export const getUserShortcuts = () => cachedUserShortcuts;
export const getCachedSheetsRangeFormat = () => cachedSheetsRangeFormat;

/**
 * Read the current Sheets range format, including changes made in other tabs.
 *
 * @returns The saved format or the default when no valid value is stored.
 */
export const getSheetsRangeFormat = async (): Promise<LinkFormat> => {
  const storedFormat: unknown = await GM.getValue(
    "sheetsRangeFormat",
    "htmlWithEmoji",
  );
  return isSheetsRangeFormat(storedFormat) ? storedFormat : "htmlWithEmoji";
};

export const getShortcutForCommand = (
  commandKey: string,
): ShortcutDefinition | undefined => cachedUserShortcuts[commandKey];

/**
 * Save a settings batch and update the cache only after every write succeeds.
 *
 * @param values Validated settings to replace.
 */
export const updateSettings = async (values: Partial<SettingsValues>) => {
  await saveStoredSettings(values);
  if (values.emojiNames !== undefined) {
    cachedEmojiNames = values.emojiNames;
  }
  if (values.customRegexes !== undefined) {
    cachedCustomRegexes = values.customRegexes;
  }
  if (values.userShortcuts !== undefined) {
    cachedUserShortcuts = values.userShortcuts;
  }
  if (values.sheetsRangeFormat !== undefined) {
    cachedSheetsRangeFormat = values.sheetsRangeFormat;
  }
};
