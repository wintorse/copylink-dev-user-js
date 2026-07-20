import {
  type GitHubPullRequestStatus,
  getGitHubPullRequestStatus,
} from "@copylink-dev/shared/githubPullRequestStatus";
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

/**
 * Check whether the current URL is a GitHub pull request page.
 *
 * @param hostname Current location hostname.
 * @param pathname Current location pathname.
 * @returns True when the path matches `/owner/repo/pull/<number>` (optionally followed by subpaths) on GitHub.
 */
const isGitHubPullRequestDetailPage = (
  hostname: string,
  pathname: string,
): boolean => {
  const [, owner, repo, resource, id] = pathname.split("/");
  return (
    hostname === "github.com" &&
    owner !== undefined &&
    repo !== undefined &&
    resource === "pull" &&
    /^\d+$/.test(id ?? "")
  );
};

/**
 * Resolve GitHub pull request status only on GitHub pull request pages.
 *
 * @param hostname Current location hostname.
 * @param pathname Current location pathname.
 * @returns Pull request status when available; otherwise undefined.
 */
const getGitHubPullRequestStatusForPage = (
  hostname: string,
  pathname: string,
): GitHubPullRequestStatus | undefined => {
  if (isGitHubPullRequestDetailPage(hostname, pathname)) {
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
