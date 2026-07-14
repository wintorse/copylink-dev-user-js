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
import { getGitHubPullRequestStatus } from "@copylink-dev/shared/githubPullRequestStatus";

const getGitHubPullRequestStatusForPage = (
  hostname: string,
  pathname: string,
) => {
  const pathParts = pathname.split("/");
  if (hostname === "github.com" && pathParts[3] === "pull") {
    return getGitHubPullRequestStatus();
  }
};

/**
 * Resolve the emoji name for the current page context.
 *
 * @returns Resolved emoji name string.
 */
export const getEmojiName = async (): Promise<string> => {
  if (!isSettingsLoaded()) {
    await refreshSettingsCache();
  }

  const { hostname, pathname } = window.location;

  const ctx: PageContext = {
    href: window.location.href,
    hostname,
    pathname,
    documentBodyId: document.body?.id,
    documentTitle: document.title,
    githubPullRequestStatus: getGitHubPullRequestStatusForPage(
      hostname,
      pathname,
    ),
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
