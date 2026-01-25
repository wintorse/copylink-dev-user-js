import {
  CUSTOM_REGEX_KEYS,
  DEFAULT_EMOJI_NAMES,
} from "@copylink-dev/shared/constants";
import type {
  CustomRegexes,
  EmojiName,
  EmojiNameRecord,
} from "@copylink-dev/types/types";

export type UserShortcuts = Record<string, ShortcutDefinition>;

export type ShortcutDefinition = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
};

let cachedEmojiNames: EmojiNameRecord = { ...DEFAULT_EMOJI_NAMES };
let cachedCustomRegexes: Partial<
  Record<(typeof CUSTOM_REGEX_KEYS)[number], string>
> = {};
let cachedUserShortcuts: UserShortcuts = {};
let settingsLoaded = false;

export const refreshSettingsCache = async () => {
  cachedEmojiNames = await GM.getValue("emojiNames", DEFAULT_EMOJI_NAMES);
  cachedCustomRegexes = await GM.getValue("customRegexes", {});
  cachedUserShortcuts = await GM.getValue("userShortcuts", {});
  settingsLoaded = true;
};

export const getCachedEmojiNames = () => cachedEmojiNames;
export const getCachedCustomRegexes = () => cachedCustomRegexes;
export const getUserShortcuts = () => cachedUserShortcuts;
export const isSettingsLoaded = () => settingsLoaded;

export const getShortcutForCommand = (
  commandKey: string,
): ShortcutDefinition | undefined => cachedUserShortcuts[commandKey];

export const updateCustomRegex = async (
  key: keyof CustomRegexes,
  value: string,
) => {
  cachedCustomRegexes[key] = value;
  await GM.setValue("customRegexes", cachedCustomRegexes);
};

export const updateEmojiName = async (
  key: keyof EmojiNameRecord,
  value: EmojiName,
) => {
  cachedEmojiNames[key] = value;
  await GM.setValue("emojiNames", cachedEmojiNames);
};

export const updateShortcut = async (
  commandKey: string,
  shortcut: ShortcutDefinition,
) => {
  cachedUserShortcuts[commandKey] = shortcut;
  await GM.setValue("userShortcuts", cachedUserShortcuts);
};
