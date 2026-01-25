import {
  CUSTOM_REGEX_KEYS,
  DEFAULT_EMOJI_NAMES,
  EMOJI_KEYS,
} from "@copylink-dev/types/constants";
import type { CustomRegexes, EmojiNameRecord } from "@copylink-dev/types/types";
import { normalizeEmojiValue } from "@copylink-dev/shared/popup/emojiSettings";
import { getMessage } from "./i18n";
import {
  getCachedCustomRegexes,
  getCachedEmojiNames,
  getUserShortcuts,
  refreshSettingsCache,
  updateCustomRegex,
  updateEmojiName,
  updateShortcut,
} from "./cache";
import { showToast } from "./toast";
import { isMac } from "./constants";
import type { Shortcut, ShortcutMap, SettingsController } from "./types";
import settingsStyleText from "./settings-ui.css?raw";
export type { SettingsController } from "./types";

const SettingsHostId = "copylink-dev-settings-host";
const SettingsPanelId = "copylink-dev-settings";

type DefaultsMap = ShortcutMap;

const shortcutCommands: { key: string; label: string }[] = [
  { key: "copy-link", label: getMessage("shortcutCopyLink") },
  { key: "copy-link-for-slack", label: getMessage("shortcutCopyLinkForSlack") },
  { key: "copy-title", label: getMessage("shortcutCopyTitle") },
  {
    key: "copy-google-sheets-range",
    label: getMessage("shortcutCopyGoogleSheetsRange"),
  },
];

const slackFields = [
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

const getHost = () => {
  let host = document.getElementById(SettingsHostId);
  if (!host) {
    host = document.createElement("div");
    host.id = SettingsHostId;
    (document.body || document.documentElement).appendChild(host);
  }
  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
  return { host, shadow };
};

let panelElement: HTMLDivElement | null = null;
let panelShadowRoot: ShadowRoot | null = null;
let isPanelVisible = false;
let defaultsRef: DefaultsMap | null = null;
let onSavedRef: (() => void) | undefined;

const updateVisibilityState = () => {
  if (!panelElement) return;
  isPanelVisible = panelElement.style.display !== "none";
};

const formatShortcut = (shortcut: Shortcut) => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.meta) parts.push(isMac ? "⌘" : "Win");
  parts.push(shortcut.key.toUpperCase());
  return parts.join(" + ");
};

const getEffectiveShortcut = (commandKey: string) => {
  const userShortcuts = getUserShortcuts();
  return (userShortcuts[commandKey] || defaultsRef?.[commandKey]) as Shortcut;
};

const createShortcutInput = (commandKey: string, labelText: string) => {
  const wrapper = document.createElement("div");
  wrapper.className = "shortcut-row";

  const label = document.createElement("label");
  label.className = "shortcut-label";
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "shortcut-input";
  input.id = `shortcut-${commandKey}`;
  input.dataset.commandKey = commandKey;
  input.readOnly = true;

  const current = getEffectiveShortcut(commandKey);
  if (current) {
    input.value = formatShortcut(current);
  }

  input.addEventListener("focus", () => {
    input.value = "";
    input.placeholder = getMessage("shortcutInputPlaceholder");
  });

  input.addEventListener("blur", () => {
    if (!input.value) {
      const shortcut = getEffectiveShortcut(commandKey);
      if (shortcut) {
        input.value = formatShortcut(shortcut);
      }
    }
  });

  input.addEventListener("keydown", (e) => {
    e.preventDefault();
    const shortcut: Shortcut = {
      key: e.key.length === 1 ? e.key.toLowerCase() : e.key,
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
    };
    input.value = formatShortcut(shortcut);
    input.dataset.shortcut = JSON.stringify(shortcut);
  });

  label.appendChild(input);
  wrapper.appendChild(label);

  return wrapper;
};

const createEmojiFields = () => {
  const section = document.createElement("div");
  section.className = "section";

  slackFields.forEach((field, index) => {
    const label = document.createElement("label");
    label.textContent = field.label;

    const input = document.createElement("input");
    input.type = "text";
    input.id = field.id;
    input.placeholder =
      index === 0 ? getMessage("emojiPlaceholder") : field.placeholder;
    input.dataset.emojiKey = field.id;

    label.appendChild(input);
    section.appendChild(label);
  });

  return section;
};

const createCustomSitesFields = () => {
  const section = document.createElement("div");
  section.className = "section";

  for (let i = 1; i <= 5; i++) {
    const pair = document.createElement("div");
    pair.className = "custom-pair";

    const regexLabel = document.createElement("label");
    regexLabel.textContent = getMessage("customWebsiteRegex", {
      num: i.toString(),
    });
    const regexInput = document.createElement("input");
    regexInput.type = "text";
    regexInput.id = `customRegex${i}`;
    regexInput.placeholder = "www\\.example\\.com";
    regexInput.dataset.regexKey = CUSTOM_REGEX_KEYS[i - 1];
    regexLabel.appendChild(regexInput);

    const emojiLabel = document.createElement("label");
    emojiLabel.textContent = getMessage("customWebsiteEmoji", {
      num: i.toString(),
    });
    const emojiInput = document.createElement("input");
    emojiInput.type = "text";
    emojiInput.id = `customWebsite${i}`;
    emojiInput.placeholder =
      i === 1 ? getMessage("emojiPlaceholder") : "絵文字";
    emojiInput.dataset.emojiKey = `customWebsite${i}`;
    emojiLabel.appendChild(emojiInput);

    pair.appendChild(regexLabel);
    pair.appendChild(emojiLabel);
    section.appendChild(pair);
  }

  return section;
};

const createSettingsPanel = () => {
  const { shadow } = getHost();

  while (shadow.firstChild) {
    shadow.removeChild(shadow.firstChild);
  }

  const style = document.createElement("style");
  style.textContent = settingsStyleText;
  shadow.appendChild(style);

  const panel = document.createElement("div");
  panel.id = SettingsPanelId;

  const header = document.createElement("h2");
  header.textContent = getMessage("settingsTitle");
  panel.appendChild(header);

  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => hidePanel());
  panel.appendChild(closeBtn);

  const settingsContent = document.createElement("div");
  settingsContent.className = "settings-content";

  const shortcutHeader = document.createElement("h3");
  shortcutHeader.textContent = getMessage("shortcutSettings");
  settingsContent.appendChild(shortcutHeader);

  const shortcutSection = document.createElement("div");
  shortcutSection.className = "shortcut-section";
  shortcutCommands.forEach((shortcut) => {
    const row = createShortcutInput(shortcut.key, shortcut.label);
    shortcutSection.appendChild(row);
  });
  settingsContent.appendChild(shortcutSection);

  const slackHeader = document.createElement("h3");
  slackHeader.textContent = getMessage("slackEmojiSettings");
  settingsContent.appendChild(slackHeader);
  settingsContent.appendChild(createEmojiFields());

  const customHeader = document.createElement("h3");
  customHeader.textContent = getMessage("customWebsites");
  settingsContent.appendChild(customHeader);

  const customDescription = document.createElement("p");
  customDescription.textContent = getMessage("customWebsitesDescription");
  settingsContent.appendChild(customDescription);

  settingsContent.appendChild(createCustomSitesFields());

  const repoLinkSection = document.createElement("div");
  repoLinkSection.className = "repo-link-section";
  const repoLinkWrapper = document.createElement("span");
  repoLinkWrapper.className = "repo-link-wrapper";
  const repoLinkText = document.createElement("p");
  repoLinkText.textContent = "source code is available on";
  repoLinkWrapper.appendChild(repoLinkText);
  const repoLink = document.createElement("a");
  repoLink.className = "repo-link";
  repoLink.href = "https://github.com/wintorse/copylink-dev-user-js";
  repoLink.textContent = "GitHub";
  repoLink.target = "_blank";
  repoLinkWrapper.appendChild(repoLink);
  repoLinkSection.appendChild(repoLinkWrapper);

  settingsContent.appendChild(repoLinkSection);

  panel.appendChild(settingsContent);

  const saveBtn = document.createElement("button");
  saveBtn.className = "save-btn";
  saveBtn.textContent = getMessage("saveSettings");
  saveBtn.addEventListener("click", () => saveSettings());
  panel.appendChild(saveBtn);

  shadow.appendChild(panel);
  panelElement = panel;
  panelShadowRoot = shadow;
  panel.style.display = "none";
  isPanelVisible = false;
};

const loadShortcuts = () => {
  if (!panelShadowRoot || !defaultsRef) return;
  const root = panelShadowRoot;
  const userShortcuts = getUserShortcuts();

  shortcutCommands.forEach(({ key }) => {
    const input = root.querySelector<HTMLInputElement>(`#shortcut-${key}`);
    const effective = userShortcuts[key] || defaultsRef?.[key];
    if (input && effective) {
      input.value = formatShortcut(effective as Shortcut);
      input.dataset.shortcut = JSON.stringify(effective);
    }
  });
};

const loadEmojiFields = () => {
  if (!panelShadowRoot) return;
  const root = panelShadowRoot;
  const emojiNames = getCachedEmojiNames();

  EMOJI_KEYS.forEach((key) => {
    const input = root.querySelector<HTMLInputElement>(`#${key}`);
    if (!input) return;
    input.value = emojiNames[key];
    input.placeholder = DEFAULT_EMOJI_NAMES[key];
  });
};

const loadCustomRegexFields = () => {
  if (!panelShadowRoot) return;
  const root = panelShadowRoot;
  const regexes = getCachedCustomRegexes();

  CUSTOM_REGEX_KEYS.forEach((key, idx) => {
    const input = root.querySelector<HTMLInputElement>(
      `#customRegex${idx + 1}`,
    );
    if (input) {
      input.value = regexes[key] ?? "";
    }
  });
};

const loadSettings = () => {
  loadShortcuts();
  loadEmojiFields();
  loadCustomRegexFields();
};

const saveSettings = async () => {
  if (!panelShadowRoot || !defaultsRef) return;
  const root = panelShadowRoot;

  const emojiInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-emoji-key]"),
  );
  const regexInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-regex-key]"),
  );
  const shortcutInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>("[data-command-key]"),
  );

  for (const input of emojiInputs) {
    const key = input.dataset.emojiKey as keyof EmojiNameRecord;
    const normalized = normalizeEmojiValue(
      input.value,
      DEFAULT_EMOJI_NAMES[key],
    );
    await updateEmojiName(key, normalized);
  }

  for (const input of regexInputs) {
    const key = input.dataset.regexKey as keyof CustomRegexes;
    await updateCustomRegex(key, input.value || "");
  }

  for (const input of shortcutInputs) {
    const commandKey = input.dataset.commandKey as string;
    const parsed = input.dataset.shortcut
      ? (JSON.parse(input.dataset.shortcut) as Shortcut)
      : defaultsRef[commandKey];
    if (parsed) {
      await updateShortcut(commandKey, parsed);
    }
  }

  await refreshSettingsCache();
  showToast(getMessage("settingsSaved"));
  hidePanel();
  onSavedRef?.();
};

const showPanel = async () => {
  if (!panelElement) return;
  await refreshSettingsCache();
  loadSettings();
  panelElement.style.display = "block";
  updateVisibilityState();
};

const hidePanel = () => {
  if (!panelElement) return;
  panelElement.style.display = "none";
  updateVisibilityState();
};

const togglePanel = async () => {
  if (isPanelVisible) {
    hidePanel();
  } else {
    await showPanel();
  }
};

export const initSettingsUI = async (
  defaults: DefaultsMap,
  onSaved?: () => void,
): Promise<SettingsController> => {
  defaultsRef = defaults;
  onSavedRef = onSaved;

  await refreshSettingsCache();

  if (!panelElement || !panelShadowRoot) {
    createSettingsPanel();
  }

  loadSettings();

  return {
    show: showPanel,
    hide: hidePanel,
    toggle: togglePanel,
    isOpen: () => isPanelVisible,
  };
};
