import type {
  CustomRegexes,
  EmojiNameRecord,
  LinkFormat,
} from "@copylink-dev/types/types";
import type { CUSTOM_REGEX_KEYS } from "@copylink-dev/shared/constants";
import { isSheetsRangeFormat } from "./settings-ui-config";

export type UserShortcuts = Record<string, ShortcutDefinition>;

export type ShortcutDefinition = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
};

let cachedEmojiNames: Partial<EmojiNameRecord> = {};
let cachedCustomRegexes: Partial<
  Record<(typeof CUSTOM_REGEX_KEYS)[number], string>
> = {};
let cachedUserShortcuts: UserShortcuts = {};
let cachedSheetsRangeFormat: LinkFormat = "htmlWithEmoji";
let settingsLoaded = false;

/**
 * Reload settings from persistent userscript storage into in-memory cache.
 *
 * @returns Nothing.
 */
export const refreshSettingsCache = async () => {
  cachedEmojiNames = await GM.getValue("emojiNames", {});
  cachedCustomRegexes = await GM.getValue("customRegexes", {});
  cachedUserShortcuts = await GM.getValue("userShortcuts", {});
  const storedFormat = await GM.getValue("sheetsRangeFormat", "htmlWithEmoji");
  cachedSheetsRangeFormat = isSheetsRangeFormat(storedFormat)
    ? storedFormat
    : "htmlWithEmoji";
  settingsLoaded = true;
};

export const getCachedEmojiNames = () => cachedEmojiNames;
export const getCachedCustomRegexes = () => cachedCustomRegexes;
export const getUserShortcuts = () => cachedUserShortcuts;
export const getCachedSheetsRangeFormat = () => cachedSheetsRangeFormat;
export const isSettingsLoaded = () => settingsLoaded;

export const getShortcutForCommand = (
  commandKey: string,
): ShortcutDefinition | undefined => cachedUserShortcuts[commandKey];

/**
 * Update one custom regex and persist it to storage.
 *
 * @param key Custom regex key.
 * @param value Regex string.
 * @returns Nothing.
 */
export const updateCustomRegex = async (
  key: keyof CustomRegexes,
  value: string,
) => {
  cachedCustomRegexes[key] = value;
  await GM.setValue("customRegexes", cachedCustomRegexes);
};

/**
 * Replace emoji overrides so omitted PR status values can inherit the common emoji.
 *
 * @param emojiNames Normalized emoji overrides.
 * @returns Nothing.
 */
export const updateEmojiNames = async (
  emojiNames: Partial<EmojiNameRecord>,
) => {
  cachedEmojiNames = emojiNames;
  await GM.setValue("emojiNames", cachedEmojiNames);
};

/**
 * Update one command shortcut and persist it to storage.
 *
 * @param commandKey Command identifier.
 * @param shortcut Shortcut definition.
 * @returns Nothing.
 */
export const updateShortcut = async (
  commandKey: string,
  shortcut: ShortcutDefinition,
) => {
  cachedUserShortcuts[commandKey] = shortcut;
  await GM.setValue("userShortcuts", cachedUserShortcuts);
};

export const updateSheetsRangeFormat = async (format: LinkFormat) => {
  cachedSheetsRangeFormat = format;
  await GM.setValue("sheetsRangeFormat", format);
};
