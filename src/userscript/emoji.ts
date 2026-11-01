import { buildPageContext } from "@copylink-dev/shared/pageContext";
import { getEmojiSettings } from "./settings-storage";
import { resolveEmojiName } from "@copylink-dev/shared/emojiResolver";

/**
 * Resolve the emoji name for the current page context.
 *
 * @returns Resolved emoji name string.
 */
export const getEmojiName = async (): Promise<string> => {
  const settings = await getEmojiSettings();
  return resolveEmojiName(buildPageContext(), settings);
};
