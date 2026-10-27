import { copyWithShortcut, expect, gotoFixture, test } from "./fixtures";

const redocCredit =
  '<a href="https://redocly.com/redoc/">API docs by Redocly</a>';

for (const fixture of [
  {
    name: "ReDoc v2",
    title: "Orders API",
    body: `<div class="redoc-wrap"><label class="menu-item active"><span>GET</span><span> List orders </span></label></div>${redocCredit}`,
    expectedTitle: "List orders",
    emoji: ":swagger:",
  },
  {
    name: "ReDoc v3",
    title: "Orders API",
    body: `<ul><li data-active="false"><span data-text>List orders</span></li><li data-active="true"><span data-text>Create order</span><span>post</span></li></ul>${redocCredit}`,
    expectedTitle: "Create order",
    emoji: ":swagger:",
  },
  {
    name: "ReDoc without an active menu",
    title: "Orders API",
    body: redocCredit,
    expectedTitle: "Orders API",
    emoji: ":swagger:",
  },
  {
    name: "a page mentioning ReDoc without attribution",
    title: "Notes about ReDoc",
    body: '<div class="redoc-wrap"><label class="active"><span>GET</span><span>Unrelated label</span></label></div>',
    expectedTitle: "Notes about ReDoc",
    emoji: "",
  },
  {
    name: "Redmine with a credit in the second footer link",
    title: "Issue tracker",
    body: '<div id="footer"><a>Help</a><a>Powered by Redmine</a></div><div id="content"><h2>Issue #1</h2><h3>Summary</h3></div>',
    expectedTitle: "Issue #1: Summary",
    emoji: ":redmine_ticket:",
  },
  {
    name: "a page mentioning Redmine outside footer links",
    title: "Migration notes",
    body: '<div id="footer">We migrated from Redmine</div>',
    expectedTitle: "Migration notes",
    emoji: "",
  },
  {
    name: "Redmine without an issue title",
    title: "Issue tracker",
    body: '<div id="footer"><a>Redmine</a></div><div id="content"><h2>Issue #1</h2></div>',
    expectedTitle: "Issue tracker",
    emoji: ":redmine_ticket:",
  },
  {
    name: "Jira without an issue title",
    title: "Issue tracker",
    bodyId: "jira",
    body: '<a id="key-val">ABC-1</a>',
    expectedTitle: "Issue tracker",
    emoji: ":jira:",
  },
]) {
  test(`${fixture.name} uses consistent title and emoji detection`, async ({
    page,
    shortcutModifier,
  }) => {
    // Given: The userscript is running on a local page with site-specific markup.
    await gotoFixture(page);
    await page.evaluate(
      ({ title, body, bodyId }) => {
        document.title = title;
        document.body.id = bodyId ?? "";
        document.body.insertAdjacentHTML("beforeend", body);
      },
      { ...fixture, bodyId: "bodyId" in fixture ? fixture.bodyId : undefined },
    );

    // When: A Slack link is copied using the shared site detection logic.
    const payload = await copyWithShortcut(
      page,
      `${shortcutModifier}+Shift+l`,
      `[${fixture.expectedTitle}](${page.url()})`,
      "リンクをクリップボードにコピーしました",
    );

    // Then: The HTML has the same title as the Markdown and the expected emoji.
    const content = await page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return {
        title: doc.querySelector("a")?.textContent,
        text: doc.body.textContent?.replace(/\s+/g, " ").trim(),
      };
    }, payload["text/html"]);
    expect(content).toEqual({
      title: fixture.expectedTitle,
      text: [fixture.emoji, fixture.expectedTitle].filter(Boolean).join(" "),
    });
  });
}
