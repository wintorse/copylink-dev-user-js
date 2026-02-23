import {
  type PageContext,
  resolveEmojiName,
} from "@copylink-dev/shared/emojiResolver";
import {
  getCachedCustomRegexes,
  getCachedEmojiNames,
  isSettingsLoaded,
  refreshSettingsCache,
} from "./cache";

export const getEmojiName = async (): Promise<string> => {
  if (!isSettingsLoaded()) {
    await refreshSettingsCache();
  }

  const ctx: PageContext = {
    href: window.location.href,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    documentBodyId: document.body?.id,
    documentTitle: document.title,
    hasRedmineFooter: document
      .querySelector("#footer a")
      ?.textContent?.includes("Redmine"),
    hasRedocWrap: Boolean(document.querySelector(".redoc-wrap")),
  };

  return resolveEmojiName(ctx, {
    emojiNames: getCachedEmojiNames(),
    customRegexes: getCachedCustomRegexes(),
  });
};
