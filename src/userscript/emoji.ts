import {
  getCachedCustomRegexes,
  getCachedEmojiNames,
  isSettingsLoaded,
  refreshSettingsCache,
} from "./cache";
import { buildPageContext } from "@copylink-dev/shared/pageContext";
import { resolveEmojiName } from "@copylink-dev/shared/emojiResolver";

/**
 * Resolve the emoji name for the current page context.
 *
 * @returns Resolved emoji name string.
 */
export const getEmojiName = async (): Promise<string> => {
  if (!isSettingsLoaded()) {
    await refreshSettingsCache();
  }

  return resolveEmojiName(buildPageContext(), {
    emojiNames: getCachedEmojiNames(),
    customRegexes: getCachedCustomRegexes(),
  });
};
