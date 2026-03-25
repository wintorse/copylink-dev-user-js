import {
  CUSTOM_REGEX_KEYS,
  DEFAULT_EMOJI_NAMES,
  EMOJI_KEYS,
} from "@copylink-dev/shared/constants";
import type {
  CustomRegexKeys,
  EmojiKeys,
  LinkFormat,
} from "@copylink-dev/types/types";
import type { Shortcut } from "./types";
import { getMessage } from "./i18n";

/** Allowed format values for the Sheets range copy shortcut. */
export const SHEETS_RANGE_FORMATS = [
  "html",
  "htmlWithEmoji",
  "markdown",
  "plainUrl",
] as const satisfies ReadonlyArray<LinkFormat>;

export type SheetsRangeFormat = (typeof SHEETS_RANGE_FORMATS)[number];

/** Type guard for valid `sheetsRangeFormat` values. */
export const isSheetsRangeFormat = (
  value: unknown,
): value is SheetsRangeFormat =>
  typeof value === "string" &&
  (SHEETS_RANGE_FORMATS as ReadonlyArray<string>).includes(value);

export const isEmojiKey = (key: string | undefined): key is EmojiKeys =>
  key !== undefined && (EMOJI_KEYS as ReadonlyArray<string>).includes(key);

export const isCustomRegexKey = (
  key: string | undefined,
): key is CustomRegexKeys =>
  key !== undefined &&
  (CUSTOM_REGEX_KEYS as ReadonlyArray<string>).includes(key);

export const isShortcut = (value: unknown): value is Shortcut =>
  typeof value === "object" &&
  value !== null &&
  "key" in value &&
  typeof (value as Record<string, unknown>).key === "string";

/** Command definitions shown in the shortcuts section. */
export const shortcutCommands: Array<{ key: string; label: string }> = [
  { key: "copy-link", label: getMessage("shortcutCopyLink") },
  { key: "copy-link-for-slack", label: getMessage("shortcutCopyLinkForSlack") },
  { key: "copy-title", label: getMessage("shortcutCopyTitle") },
  {
    key: "copy-google-sheets-range",
    label: getMessage("shortcutCopyGoogleSheetsRange"),
  },
];

/** Emoji fields shown in the Slack-style emoji settings section. */
export const slackFields = [
  {
    id: "googleSheets",
    label: getMessage("googleSheets"),
    placeholder: DEFAULT_EMOJI_NAMES.googleSheets,
  },
  {
    id: "googleDocs",
    label: getMessage("googleDocs"),
    placeholder: DEFAULT_EMOJI_NAMES.googleDocs,
  },
  {
    id: "googleSlides",
    label: getMessage("googleSlides"),
    placeholder: DEFAULT_EMOJI_NAMES.googleSlides,
  },
  {
    id: "googleDrive",
    label: getMessage("googleDrive"),
    placeholder: DEFAULT_EMOJI_NAMES.googleDrive,
  },
  {
    id: "github",
    label: getMessage("github"),
    placeholder: DEFAULT_EMOJI_NAMES.github,
  },
  {
    id: "githubPullRequest",
    label: getMessage("githubPullRequest"),
    placeholder: DEFAULT_EMOJI_NAMES.githubPullRequest,
  },
  {
    id: "githubIssue",
    label: getMessage("githubIssue"),
    placeholder: DEFAULT_EMOJI_NAMES.githubIssue,
  },
  {
    id: "jiraIssue",
    label: getMessage("jiraIssue"),
    placeholder: DEFAULT_EMOJI_NAMES.jiraIssue,
  },
  {
    id: "asanaTask",
    label: getMessage("asanaTask"),
    placeholder: DEFAULT_EMOJI_NAMES.asanaTask,
  },
  {
    id: "backlogIssue",
    label: getMessage("backlogIssue"),
    placeholder: DEFAULT_EMOJI_NAMES.backlogIssue,
  },
  {
    id: "redmineIssue",
    label: getMessage("redmineIssue"),
    placeholder: DEFAULT_EMOJI_NAMES.redmineIssue,
  },
  {
    id: "reDoc",
    label: getMessage("reDoc"),
    placeholder: DEFAULT_EMOJI_NAMES.reDoc,
  },
];
