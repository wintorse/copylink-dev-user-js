import {
  CUSTOM_REGEX_KEYS,
  DEFAULT_EMOJI_NAMES,
  EMOJI_KEYS,
} from "@copylink-dev/types/constants";
import type { CustomRegexes, EmojiNameRecord } from "@copylink-dev/types/types";
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
import { isMac } from "./entry";

const SettingsHostId = "copylink-dev-settings-host";
const SettingsPanelId = "copylink-dev-settings";
const SettingsButtonId = "copylink-dev-settings-toggle";

type Shortcut = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
};

type DefaultsMap = Record<string, Shortcut>;

export type SettingsController = {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  isOpen: () => boolean;
};

const shortcutCommands: { key: string; label: string }[] = [
  { key: "copy-link", label: getMessage("shortcutCopyLink") },
  { key: "copy-link-for-slack", label: getMessage("shortcutCopyLinkForSlack") },
  { key: "copy-title", label: getMessage("shortcutCopyTitle") },
  {
    key: "copy-google-sheets-range",
    label: getMessage("shortcutCopyGoogleSheetsRange"),
  },
];

const settingsStyles = `
  #${SettingsPanelId} {
    position: fixed;
    bottom: 80px;
    left: 24px;
    background-color: #f9f9f9;
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 12px;
    z-index: 20001;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-width: 360px;
    height: 520px;
    font-family: 'Noto Sans', Roboto, Arial, sans-serif;
    color: #333;
    text-align: left;
    font-size: 14px;
    line-height: normal;
    box-sizing: border-box;
    display: none;
  }
  #${SettingsPanelId} * { box-sizing: border-box; }
  #${SettingsPanelId} h2 { margin: 0 0 12px 0; font-size: 1.2em; }
  #${SettingsPanelId} h3 { margin: 14px 0 8px; font-size: 1em; }
  #${SettingsPanelId} .settings-content {
    height: calc(100% - 120px);
    overflow-y: auto;
    padding-right: 4px;
  }
  #${SettingsPanelId} .settings-content::-webkit-scrollbar {
    width: 8px;
  }
  #${SettingsPanelId} .settings-content::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.2);
    border-radius: 4px;
  }
  #${SettingsPanelId} .section { margin-bottom: 12px; }
  #${SettingsPanelId} label { display: block; font-weight: 600; margin: 6px 0 4px; }
  #${SettingsPanelId} input[type="text"] {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
  }
  #${SettingsPanelId} .shortcut-input { text-align: center; }
  #${SettingsPanelId} .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    align-items: center;
  }
  #${SettingsPanelId} .footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 10px;
  }
  #${SettingsPanelId} button.save-btn {
    background: #007bff;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
  }
  #${SettingsPanelId} button.close-btn {
    background: transparent;
    border: none;
    font-size: 20px;
    cursor: pointer;
  }
  #${SettingsButtonId} {
    position: fixed;
    bottom: 20px;
    left: 24px;
    padding: 8px 10px;
    border-radius: 6px;
    border: none;
    background: #444;
    color: #fff;
    cursor: pointer;
    font-size: 13px;
    z-index: 20000;
  }
`;

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

const updateVisibilityState = () => {
  if (!panelElement) return;
  isPanelVisible = panelElement.style.display !== "none";
};

const showPanel = () => {
  if (!panelElement) return;
  panelElement.style.display = "block";
  updateVisibilityState();
};

const hidePanel = () => {
  if (!panelElement) return;
  panelElement.style.display = "none";
  updateVisibilityState();
};

const togglePanel = () => {
  if (isPanelVisible) {
    hidePanel();
  } else {
    showPanel();
  }
};

const formatShortcut = (combo: Shortcut) => {
  const parts: string[] = [];
  if (combo.ctrl) parts.push("Ctrl");
  if (combo.shift) parts.push("Shift");
  if (combo.alt) parts.push("Alt");
  if (combo.meta) isMac ? parts.push("⌘") : parts.push("Win");
  parts.push(combo.key.toUpperCase());
  return parts.join("+");
};

const parseEventToShortcut = (ev: KeyboardEvent): Shortcut => ({
  key: ev.key.length === 1 ? ev.key.toLowerCase() : ev.key,
  ctrl: ev.ctrlKey,
  shift: ev.shiftKey,
  alt: ev.altKey,
  meta: ev.metaKey,
});

const createShortcutRow = (commandKey: string, value: Shortcut) => {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "shortcut-input";
  input.dataset.commandKey = commandKey;
  input.value = formatShortcut(value);
  input.addEventListener("focus", () => {
    input.value = "";
    input.placeholder = getMessage("shortcutInputPlaceholder");
  });
  input.addEventListener("blur", () => {
    if (!input.value) {
      input.value = formatShortcut(value);
    }
  });
  input.addEventListener("keydown", (ev) => {
    ev.preventDefault();
    const combo = parseEventToShortcut(ev);
    input.value = formatShortcut(combo);
    input.dataset.shortcut = JSON.stringify(combo);
  });
  return input;
};

const populateEmojiSection = (container: HTMLElement) => {
  const emojiNames = getCachedEmojiNames();
  EMOJI_KEYS.forEach((key) => {
    const label = document.createElement("label");
    label.textContent = key;
    const input = document.createElement("input");
    input.type = "text";
    input.id = key;
    input.value = emojiNames[key];
    input.dataset.emojiKey = key;
    container.appendChild(label);
    container.appendChild(input);
  });
};

const populateCustomRegexSection = (container: HTMLElement) => {
  const regexes = getCachedCustomRegexes();
  CUSTOM_REGEX_KEYS.forEach((key, idx) => {
    const label = document.createElement("label");
    label.textContent = getMessage("customWebsiteRegex").replace(
      "%num%",
      String(idx + 1),
    );
    const input = document.createElement("input");
    input.type = "text";
    input.value = regexes[key] ?? "";
    input.dataset.regexKey = key;
    container.appendChild(label);
    container.appendChild(input);
  });
};

const populateShortcutSection = (
  container: HTMLElement,
  defaults: DefaultsMap,
) => {
  const userShortcuts = getUserShortcuts();
  shortcutCommands.forEach(({ key, label }) => {
    const row = document.createElement("div");
    row.className = "row";
    const rowLabel = document.createElement("label");
    rowLabel.textContent = label;
    const current = userShortcuts[key] ?? defaults[key];
    const input = createShortcutRow(key, current);
    row.appendChild(rowLabel);
    row.appendChild(input);
    container.appendChild(row);
  });
};

const saveSettings = async (defaults: DefaultsMap, onSaved?: () => void) => {
  if (!panelShadowRoot) return;
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
    await updateEmojiName(
      key,
      (input.value as EmojiNameRecord[keyof EmojiNameRecord]) ||
        DEFAULT_EMOJI_NAMES[key],
    );
  }

  for (const input of regexInputs) {
    const key = input.dataset.regexKey as keyof CustomRegexes;
    await updateCustomRegex(key, input.value || "");
  }

  for (const input of shortcutInputs) {
    const commandKey = input.dataset.commandKey as string;
    const parsed = input.dataset.shortcut
      ? JSON.parse(input.dataset.shortcut)
      : null;
    const value = (parsed as Shortcut) ?? defaults[commandKey];
    await updateShortcut(commandKey, value);
  }

  await refreshSettingsCache();
  showToast(getMessage("settingsSaved"));
  hidePanel();
  onSaved?.();
};

const buildPanel = (
  shadow: ShadowRoot,
  defaults: DefaultsMap,
  onSaved?: () => void,
) => {
  while (shadow.firstChild) {
    shadow.removeChild(shadow.firstChild);
  }
  const style = document.createElement("style");
  style.textContent = settingsStyles;
  const panel = document.createElement("div");
  panel.id = SettingsPanelId;

  const title = document.createElement("h2");
  title.textContent = getMessage("settingsTitle");
  panel.appendChild(title);

  const content = document.createElement("div");
  content.className = "settings-content";

  const shortcutSection = document.createElement("div");
  shortcutSection.className = "section";
  const shortcutHeader = document.createElement("h3");
  shortcutHeader.textContent = getMessage("shortcutSettings");
  shortcutSection.appendChild(shortcutHeader);
  populateShortcutSection(shortcutSection, defaults);
  content.appendChild(shortcutSection);

  const emojiSection = document.createElement("div");
  emojiSection.className = "section";
  const emojiHeader = document.createElement("h3");
  emojiHeader.textContent = getMessage("slackEmojiSettings");
  emojiSection.appendChild(emojiHeader);
  populateEmojiSection(emojiSection);
  content.appendChild(emojiSection);

  const customSection = document.createElement("div");
  customSection.className = "section";
  const customHeader = document.createElement("h3");
  customHeader.textContent = getMessage("customWebsites");
  customSection.appendChild(customHeader);
  populateCustomRegexSection(customSection);
  content.appendChild(customSection);

  const footer = document.createElement("div");
  footer.className = "footer";
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", hidePanel);
  const saveBtn = document.createElement("button");
  saveBtn.className = "save-btn";
  saveBtn.textContent = getMessage("saveSettings");
  saveBtn.addEventListener("click", () => saveSettings(defaults, onSaved));
  footer.appendChild(closeBtn);
  footer.appendChild(saveBtn);
  panel.appendChild(content);
  panel.appendChild(footer);

  shadow.appendChild(style);
  shadow.appendChild(panel);
  panelElement = panel;
  panelShadowRoot = shadow;
  panel.style.display = "none";
  isPanelVisible = false;
  return panel;
};

export const initSettingsUI = async (
  defaults: DefaultsMap,
  onSaved?: () => void,
): Promise<SettingsController> => {
  await refreshSettingsCache();
  const { shadow } = getHost();
  if (!panelElement || panelShadowRoot !== shadow) {
    buildPanel(shadow, defaults, onSaved);
  }
  return {
    show: showPanel,
    hide: hidePanel,
    toggle: togglePanel,
    isOpen: () => isPanelVisible,
  };
};
