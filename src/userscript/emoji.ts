import {
  DEFAULT_EMOJI_NAMES,
  CUSTOM_EMOJI_KEYS,
  CUSTOM_REGEX_KEYS,
} from "@copylink-dev/types/constants";
import type { EmojiNameRecord } from "@copylink-dev/types/types";
import {
  getCachedCustomRegexes,
  getCachedEmojiNames,
  refreshSettingsCache,
  isSettingsLoaded,
} from "./cache";

const defaultEmoji = DEFAULT_EMOJI_NAMES;

export const getEmojiName = async (): Promise<string> => {
  if (!isSettingsLoaded()) {
    await refreshSettingsCache();
  }
  const emojiNames = getCachedEmojiNames();
  const customRegexes = getCachedCustomRegexes();
  const href = window.location.href;
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  for (let i = 0; i < CUSTOM_REGEX_KEYS.length; i += 1) {
    const regexKey = CUSTOM_REGEX_KEYS[i];
    const emojiKey = CUSTOM_EMOJI_KEYS[i];
    const regexPattern = customRegexes[regexKey];
    if (emojiNames[emojiKey] && regexPattern) {
      try {
        const regex = new RegExp(regexPattern);
        if (regex.test(href)) {
          return emojiNames[emojiKey];
        }
      } catch (error) {
        console.warn("Invalid regex", regexPattern, error);
      }
    }
  }
  const pathParts = pathname.split("/");
  const fallbackEmoji = (key: keyof EmojiNameRecord) =>
    emojiNames[key] ?? defaultEmoji[key];
  if (hostname === "docs.google.com") {
    switch (pathParts[1]) {
      case "spreadsheets":
        return fallbackEmoji("googleSheets");
      case "document":
        return fallbackEmoji("googleDocs");
      case "presentation":
        return fallbackEmoji("googleSlides");
      default:
        return fallbackEmoji("googleDrive");
    }
  }
  if (hostname === "drive.google.com") {
    return fallbackEmoji("googleDrive");
  }
  if (hostname === "github.com") {
    switch (pathParts[3]) {
      case "pull":
        return fallbackEmoji("githubPullRequest");
      case "issues":
        return fallbackEmoji("githubIssue");
      default:
        return fallbackEmoji("github");
    }
  }
  if (hostname === "app.asana.com") {
    return fallbackEmoji("asanaTask");
  }
  if (hostname.includes("backlog")) {
    return fallbackEmoji("backlogIssue");
  }
  if (
    hostname.includes("redmine") ||
    document.querySelector("#footer a")?.textContent?.includes("Redmine")
  ) {
    return fallbackEmoji("redmineIssue");
  }
  if (document.body.id === "jira") {
    return fallbackEmoji("jiraIssue");
  }
  if (
    document.title.includes("ReDoc") ||
    document.querySelector(".redoc-wrap")
  ) {
    return fallbackEmoji("reDoc");
  }
  return "";
};
