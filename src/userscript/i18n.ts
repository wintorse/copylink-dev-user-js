export type SupportedLocale = "en" | "ja" | "zh-CN";

const supportedLocales: Array<SupportedLocale> = ["ja", "en", "zh-CN"];

export const i18nMessages = {
  ja: {
    copyTitleSuccess: "タイトルをクリップボードにコピーしました",
    copyTitleFailure: "タイトルのコピーに失敗しました",
    copyLinkSuccess: "リンクをクリップボードにコピーしました",
    copyLinkFailure: "リンクのコピーに失敗しました",
    copyGoogleSheetsRangeSuccess:
      "この範囲のリンクをクリップボードにコピーしました",
    copyGoogleSheetsRangeFailure: "選択した範囲のリンクのコピーに失敗しました",
    settingsTitle: "copylink.dev 設定",
    shortcutInputPlaceholder: "キーを押してください...",
    slackEmojiSettings: "Slack絵文字設定",
    customWebsites: "Webサイトと絵文字を追加",
    customWebsitesDescription:
      "URLを正規表現で指定すると、お好みのWebサイトで指定した絵文字をコピーします。",
    saveSettings: "保存",
    settingsSaved: "設定を保存しました",
    settingsButton: "設定",
    customWebsiteRegex: "カスタムWebサイト %num% - 正規表現",
    customWebsiteEmoji: "カスタムWebサイト %num% - 絵文字",
    emojiPlaceholder: "絵文字 (例: :link:)",
    shortcutSettings: "キーボードショートカット設定",
    shortcutCopyLink: "リンクをコピー",
    shortcutCopyLinkForSlack: "Slack絵文字つきリンクをコピー",
    shortcutCopyTitle: "タイトルのみコピー",
    shortcutCopyGoogleSheetsRange:
      "Google スプレッドシートの選択した範囲のリンクを Slack 絵文字つきでコピー",
    userShortcuts: "ショートカット",
    googleSheets: "Google スプレッドシート",
    googleDocs: "Google ドキュメント",
    googleSlides: "Google スライド",
    googleDrive: "Google ドライブ",
    github: "GitHub",
    githubPullRequest: "GitHub Pull Request",
    githubIssue: "GitHub Issue",
    jiraIssue: "Jira 課題",
    asanaTask: "Asana タスク",
    backlogIssue: "Backlog 課題",
    redmineIssue: "Redmine チケット",
    reDoc: "ReDoc",
    sourceCodeOnGitHub: "ソースコード：",
    sourceCodeSuffix: "",
  },
  en: {
    copyTitleSuccess: "Title copied to clipboard",
    copyTitleFailure: "Failed to copy title to clipboard",
    copyLinkSuccess: "Link copied to clipboard",
    copyLinkFailure: "Failed to copy link to clipboard",
    copyGoogleSheetsRangeSuccess: "Link to this range copied to clipboard",
    copyGoogleSheetsRangeFailure:
      "Failed to copy link to the selected range to clipboard",
    settingsTitle: "copylink.dev Settings",
    shortcutInputPlaceholder: "Input shortcut...",
    slackEmojiSettings: "Slack Emoji Settings",
    customWebsites: "Custom Websites and Emojis",
    customWebsitesDescription:
      "Add custom websites to use emojis. You can use regular expressions to match URLs.",
    saveSettings: "Save",
    settingsSaved: "Settings saved",
    settingsButton: "Settings",
    customWebsiteRegex: "Custom website %num% - Regex",
    customWebsiteEmoji: "Custom website %num% - Emoji",
    emojiPlaceholder: "Emoji (e.g. :link:)",
    shortcutSettings: "Keyboard Shortcut Settings",
    shortcutCopyLink: "Copy Link",
    shortcutCopyLinkForSlack: "Copy Link with Slack Emoji",
    shortcutCopyTitle: "Copy Title Only",
    shortcutCopyGoogleSheetsRange:
      "Copy Google Sheets range link with Slack emoji",
    userShortcuts: "Shortcuts",
    googleSheets: "Google Sheets",
    googleDocs: "Google Docs",
    googleSlides: "Google Slides",
    googleDrive: "Google Drive",
    github: "GitHub",
    githubPullRequest: "GitHub Pull Request",
    githubIssue: "GitHub Issue",
    jiraIssue: "Jira Issue",
    asanaTask: "Asana Task",
    backlogIssue: "Backlog Issue",
    redmineIssue: "Redmine Issue",
    reDoc: "ReDoc",
    sourceCodeOnGitHub: "Source code is available on",
    sourceCodeSuffix: ".",
  },
  "zh-CN": {
    copyTitleSuccess: "标题已复制到剪贴板",
    copyTitleFailure: "复制标题到剪贴板失败",
    copyLinkSuccess: "链接已复制到剪贴板",
    copyLinkFailure: "复制链接到剪贴板失败",
    copyGoogleSheetsRangeSuccess: "指向此范围的链接已复制到剪贴板",
    copyGoogleSheetsRangeFailure: "复制Google表格范围链接到剪贴板失败",
    settingsTitle: "copylink.dev 设置",
    shortcutInputPlaceholder: "按下快捷键...",
    slackEmojiSettings: "Slack表情符号设置",
    customWebsites: "自定义网站和表情符号",
    customWebsitesDescription:
      "使用正则表达式指定URL，以便在您喜欢的网站上复制表情符号。",
    saveSettings: "保存",
    settingsSaved: "设置已保存",
    settingsButton: "设置",
    customWebsiteRegex: "自定义网站 %num% - 正则表达式",
    customWebsiteEmoji: "自定义网站 %num% - 表情符号",
    emojiPlaceholder: "表情符号 (例如: :link:)",
    shortcutSettings: "键盘快捷键设置",
    shortcutCopyLink: "复制链接",
    shortcutCopyLinkForSlack: "复制带Slack表情的链接",
    shortcutCopyTitle: "仅复制标题",
    shortcutCopyGoogleSheetsRange: "复制Google表格范围链接（带Slack表情）",
    userShortcuts: "快捷键",
    googleSheets: "Google表格",
    googleDocs: "Google文档",
    googleSlides: "Google幻灯片",
    googleDrive: "Google云端硬盘",
    github: "GitHub",
    githubPullRequest: "GitHub Pull Request",
    githubIssue: "GitHub Issue",
    jiraIssue: "Jira问题",
    asanaTask: "Asana任务",
    backlogIssue: "Backlog问题",
    redmineIssue: "Redmine问题",
    reDoc: "ReDoc",
    sourceCodeOnGitHub: "源代码：",
    sourceCodeSuffix: "",
  },
} as const;

const isSupportedLocale = (lang: string): lang is SupportedLocale =>
  (supportedLocales as ReadonlyArray<string>).includes(lang);

export const detectLocale = (): SupportedLocale => {
  const lang = navigator.language || "en";
  if (isSupportedLocale(lang)) {
    return lang;
  }
  const langBase = lang.split("-")[0];
  const match = supportedLocales.find((locale) => locale.startsWith(langBase));
  return match ?? "en";
};

type LocaleMessages = (typeof i18nMessages)[SupportedLocale];
export type MessageId = keyof LocaleMessages;

export const getMessage = (
  messageId: MessageId,
  replacements: Record<string, string> = {},
): string => {
  const locale = detectLocale();
  const message =
    i18nMessages[locale][messageId] ?? i18nMessages.en[messageId] ?? "";
  return Object.keys(replacements).reduce(
    (text, key) => text.replace(`%${key}%`, replacements[key]),
    message,
  );
};
