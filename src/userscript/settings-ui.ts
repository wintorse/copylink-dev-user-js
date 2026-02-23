import {
  CUSTOM_REGEX_KEYS,
  DEFAULT_EMOJI_NAMES,
  EMOJI_KEYS,
} from "@copylink-dev/shared/constants";
import type { CustomRegexKeys, EmojiKeys } from "@copylink-dev/types/types";
import type { SettingsController, Shortcut, ShortcutMap } from "./types";
import {
  getCachedCustomRegexes,
  getCachedEmojiNames,
  getUserShortcuts,
  refreshSettingsCache,
  updateCustomRegex,
  updateEmojiName,
  updateShortcut,
} from "./cache";
import { getMessage } from "./i18n";
import { isMac } from "./constants";
import { normalizeEmojiValue } from "@copylink-dev/shared/popup/emojiSettings";
import settingsStyleText from "./settings-ui.css?raw";
import { showToast } from "./toast";

export type { SettingsController } from "./types";

const isEmojiKey = (key: string | undefined): key is EmojiKeys =>
  key !== undefined && (EMOJI_KEYS as ReadonlyArray<string>).includes(key);

const isCustomRegexKey = (key: string | undefined): key is CustomRegexKeys =>
  key !== undefined &&
  (CUSTOM_REGEX_KEYS as ReadonlyArray<string>).includes(key);

const isShortcut = (value: unknown): value is Shortcut =>
  typeof value === "object" &&
  value !== null &&
  "key" in value &&
  typeof (value as Record<string, unknown>).key === "string";

const SettingsHostId = "copylink-dev-settings-host";
const SettingsPanelId = "copylink-dev-settings";

type DefaultsMap = ShortcutMap;

const shortcutCommands: Array<{ key: string; label: string }> = [
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
    (document.body ?? document.documentElement).appendChild(host);
  }
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  return { host, shadow };
};

let panelElement: HTMLDivElement | null = null;
let panelShadowRoot: ShadowRoot | null = null;
let isPanelVisible = false;
let defaultsRef: DefaultsMap | null = null;
let onSavedRef: (() => void) | undefined;

const updateVisibilityState = () => {
  if (!panelElement) {
    return;
  }
  isPanelVisible = panelElement.style.display !== "none";
};

const createText = (text: string) => document.createTextNode(text);

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    text?: string;
    id?: string;
    type?: string;
  } = {},
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (options.className !== undefined && options.className !== "") {
    el.className = options.className;
  }
  if (options.text !== undefined) {
    el.textContent = options.text;
  }
  if (options.id !== undefined && options.id !== "") {
    el.id = options.id;
  }
  if (
    options.type !== undefined &&
    options.type !== "" &&
    el instanceof HTMLInputElement
  ) {
    el.type = options.type;
  }
  return el;
};

const appendChildren = (parent: Node, ...children: Array<Node | null>) => {
  children.forEach((child) => {
    if (child) {
      parent.appendChild(child);
    }
  });
};

const formatShortcut = (shortcut: Shortcut) => {
  const parts: Array<string> = [];
  if (shortcut.ctrl) {
    parts.push("Ctrl");
  }
  if (shortcut.alt) {
    parts.push("Alt");
  }
  if (shortcut.shift) {
    parts.push("Shift");
  }
  if (shortcut.meta) {
    parts.push(isMac ? "⌘" : "Win");
  }
  parts.push(shortcut.key.toUpperCase());
  return parts.join(" + ");
};

const getEffectiveShortcut = (commandKey: string): Shortcut | undefined => {
  const userShortcuts = getUserShortcuts();
  return userShortcuts[commandKey] ?? defaultsRef?.[commandKey];
};

const createShortcutInput = (commandKey: string, labelText: string) => {
  const wrapper = createElement("div", { className: "shortcut-row" });
  const label = createElement("label", {
    className: "shortcut-label",
    text: labelText,
  });
  const input = createElement("input", {
    className: "shortcut-input",
    id: `shortcut-${commandKey}`,
    type: "text",
  }) as HTMLInputElement;
  input.dataset.commandKey = commandKey;
  input.readOnly = true;

  const current = getEffectiveShortcut(commandKey);
  if (current !== undefined) {
    input.value = formatShortcut(current);
  }

  input.addEventListener("focus", () => {
    input.value = "";
    input.placeholder = getMessage("shortcutInputPlaceholder");
  });

  input.addEventListener("blur", () => {
    if (!input.value) {
      const shortcut = getEffectiveShortcut(commandKey);
      if (shortcut !== undefined) {
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

  appendChildren(label, input);
  appendChildren(wrapper, label);

  return wrapper;
};

const createEmojiFields = () => {
  const section = createElement("div", { className: "section" });

  slackFields.forEach((field, index) => {
    const label = createElement("label", { text: field.label });
    const input = createElement("input", {
      id: field.id,
      type: "text",
    }) as HTMLInputElement;
    input.placeholder =
      index === 0 ? getMessage("emojiPlaceholder") : field.placeholder;
    input.dataset.emojiKey = field.id;

    appendChildren(label, input);
    appendChildren(section, label);
  });

  return section;
};

const createCustomSitesFields = () => {
  const section = createElement("div", { className: "section" });

  for (let i = 1; i <= 5; i++) {
    const pair = createElement("div", { className: "custom-pair" });
    const regexLabel = createElement("label", {
      text: getMessage("customWebsiteRegex", { num: i.toString() }),
    });
    const regexInput = createElement("input", {
      id: `customRegex${i}`,
      type: "text",
    }) as HTMLInputElement;
    regexInput.placeholder = "www\\.example\\.com";
    regexInput.dataset.regexKey = CUSTOM_REGEX_KEYS[i - 1];
    appendChildren(regexLabel, regexInput);

    const emojiLabel = createElement("label", {
      text: getMessage("customWebsiteEmoji", { num: i.toString() }),
    });
    const emojiInput = createElement("input", {
      id: `customWebsite${i}`,
      type: "text",
    }) as HTMLInputElement;
    emojiInput.placeholder =
      i === 1 ? getMessage("emojiPlaceholder") : "絵文字";
    emojiInput.dataset.emojiKey = `customWebsite${i}`;
    appendChildren(emojiLabel, emojiInput);

    appendChildren(pair, regexLabel, emojiLabel);
    appendChildren(section, pair);
  }

  return section;
};

const createSettingsPanel = () => {
  const { shadow } = getHost();

  while (shadow.firstChild) {
    shadow.removeChild(shadow.firstChild);
  }

  const style = createElement("style");
  style.textContent = settingsStyleText;
  shadow.appendChild(style);

  const panel = createElement("div", { id: SettingsPanelId });

  const header = createElement("h2", { text: getMessage("settingsTitle") });
  appendChildren(panel, header);

  const closeBtn = createElement("button", {
    className: "close-btn",
    text: "×",
  });
  closeBtn.addEventListener("click", () => hidePanel());
  appendChildren(panel, closeBtn);

  const settingsContent = createElement("div", {
    className: "settings-content",
  });

  const shortcutHeader = createElement("h3", {
    text: getMessage("shortcutSettings"),
  });
  appendChildren(settingsContent, shortcutHeader);

  const shortcutSection = createElement("div", {
    className: "shortcut-section",
  });
  shortcutCommands.forEach((shortcut) => {
    const row = createShortcutInput(shortcut.key, shortcut.label);
    appendChildren(shortcutSection, row);
  });
  appendChildren(settingsContent, shortcutSection);

  const slackHeader = createElement("h3", {
    text: getMessage("slackEmojiSettings"),
  });
  appendChildren(settingsContent, slackHeader, createEmojiFields());

  const customHeader = createElement("h3", {
    text: getMessage("customWebsites"),
  });
  appendChildren(settingsContent, customHeader);

  const customDescription = createElement("p", {
    text: getMessage("customWebsitesDescription"),
  });
  appendChildren(settingsContent, customDescription);

  appendChildren(settingsContent, createCustomSitesFields());

  const repoLinkSection = createElement("div", {
    className: "repo-link-section",
  });
  const repoLinkWrapper = createElement("p", {
    className: "repo-link-wrapper",
  });
  const repoLink = createElement("a", { className: "repo-link" });
  repoLink.href = "https://github.com/wintorse/copylink-dev-user-js";
  repoLink.textContent = "GitHub";
  repoLink.target = "_blank";
  appendChildren(
    repoLinkWrapper,
    createText(getMessage("sourceCodeOnGitHub") + " "),
    repoLink,
    createText(getMessage("sourceCodeSuffix")),
  );
  appendChildren(repoLinkSection, repoLinkWrapper);
  appendChildren(settingsContent, repoLinkSection);

  appendChildren(panel, settingsContent);

  const saveBtn = createElement("button", {
    className: "save-btn",
    text: getMessage("saveSettings"),
  });
  saveBtn.addEventListener("click", () => {
    saveSettings().catch(console.error);
  });
  appendChildren(panel, saveBtn);

  shadow.appendChild(panel);
  panelElement = panel;
  panelShadowRoot = shadow;
  panel.style.display = "none";
  isPanelVisible = false;
};

const loadShortcuts = () => {
  if (!panelShadowRoot || !defaultsRef) {
    return;
  }
  const root = panelShadowRoot;
  const userShortcuts = getUserShortcuts();

  shortcutCommands.forEach(({ key }) => {
    const input = root.querySelector<HTMLInputElement>(`#shortcut-${key}`);
    const effective = userShortcuts[key] ?? defaultsRef?.[key];
    if (input && effective !== undefined) {
      input.value = formatShortcut(effective);
      input.dataset.shortcut = JSON.stringify(effective);
    }
  });
};

const loadEmojiFields = () => {
  if (!panelShadowRoot) {
    return;
  }
  const root = panelShadowRoot;
  const emojiNames = getCachedEmojiNames();

  EMOJI_KEYS.forEach((key) => {
    const input = root.querySelector<HTMLInputElement>(`#${key}`);
    if (!input) {
      return;
    }
    input.value = emojiNames[key];
    input.placeholder = DEFAULT_EMOJI_NAMES[key];
  });
};

const loadCustomRegexFields = () => {
  if (!panelShadowRoot) {
    return;
  }
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
  if (!panelShadowRoot || !defaultsRef) {
    return;
  }
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
    const emojiKey = input.dataset.emojiKey;
    if (!isEmojiKey(emojiKey)) {
      continue;
    }
    const normalized = normalizeEmojiValue(
      input.value,
      DEFAULT_EMOJI_NAMES[emojiKey],
    );
    await updateEmojiName(emojiKey, normalized);
  }

  for (const input of regexInputs) {
    const regexKey = input.dataset.regexKey;
    if (!isCustomRegexKey(regexKey)) {
      continue;
    }
    await updateCustomRegex(regexKey, input.value || "");
  }

  for (const input of shortcutInputs) {
    const commandKey = input.dataset.commandKey ?? "";
    const parsed =
      input.dataset.shortcut !== undefined && input.dataset.shortcut !== ""
        ? (() => {
            const p: unknown = JSON.parse(input.dataset.shortcut ?? "");
            return isShortcut(p) ? p : null;
          })()
        : defaultsRef[commandKey];
    if (parsed !== null && parsed !== undefined) {
      await updateShortcut(commandKey, parsed);
    }
  }

  await refreshSettingsCache();
  showToast(getMessage("settingsSaved"));
  hidePanel();
  onSavedRef?.();
};

const showPanel = async () => {
  if (!panelElement) {
    return;
  }
  await refreshSettingsCache();
  loadSettings();
  panelElement.style.display = "block";
  updateVisibilityState();
};

const hidePanel = () => {
  if (!panelElement) {
    return;
  }
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
