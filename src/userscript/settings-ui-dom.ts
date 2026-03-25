import {
  CUSTOM_REGEX_KEYS,
  DEFAULT_EMOJI_NAMES,
} from "@copylink-dev/shared/constants";
import { shortcutCommands, slackFields } from "./settings-ui-config";
import type { LinkFormat } from "@copylink-dev/types/types";
import type { Shortcut } from "./types";
import { getMessage } from "./i18n";
import { isMac } from "./constants";
import settingsStyleText from "./settings-ui.css?raw";

/** ID of the sheets range format dropdown. */
export const SheetsRangeFormatSelectId = "sheets-range-format";

const sheetsRangeFormatOptions: Array<{
  value: LinkFormat;
  labelKey: Parameters<typeof getMessage>[0];
}> = [
  { value: "html", labelKey: "sheetsRangeFormatHtml" },
  { value: "htmlWithEmoji", labelKey: "sheetsRangeFormatHtmlWithEmoji" },
  { value: "markdown", labelKey: "sheetsRangeFormatMarkdown" },
  { value: "plainUrl", labelKey: "sheetsRangeFormatPlainUrl" },
];

/** Host element ID for the settings UI. */
export const SettingsHostId = "copylink-dev-settings-host";
/** Panel element ID for the settings UI. */
export const SettingsPanelId = "copylink-dev-settings";

/**
 * Get the ShadowRoot for the settings UI.
 * Creates the host element if it does not exist.
 *
 * @returns ShadowRoot of the settings UI.
 */
const getShadowRoot = () => {
  let host = document.getElementById(SettingsHostId);
  if (!host) {
    host = document.createElement("div");
    host.id = SettingsHostId;
    (document.body ?? document.documentElement).appendChild(host);
  }
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  return shadow;
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

/**
 * Convert a shortcut definition into a display string.
 *
 * @param shortcut Shortcut to format.
 * @returns Display-friendly shortcut string.
 */
export const formatShortcut = (shortcut: Shortcut) => {
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

const createShortcutInput = (
  commandKey: string,
  labelText: string,
  getEffectiveShortcut: (commandKey: string) => Shortcut | undefined,
) => {
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

const createSheetsRangeShortcutRow = (
  getEffectiveShortcut: (commandKey: string) => Shortcut | undefined,
) => {
  const commandKey = "copy-google-sheets-range";
  const wrapper = createElement("div", {
    className: "shortcut-row shortcut-row-sheets",
  });

  const labelWrapper = createElement("div", { className: "shortcut-label" });
  const labelForSelect = document.createElement("label");
  labelForSelect.htmlFor = SheetsRangeFormatSelectId;
  labelForSelect.textContent = getMessage("shortcutCopyGoogleSheetsRange");
  appendChildren(labelWrapper, labelForSelect);

  const select = document.createElement("select");
  select.id = SheetsRangeFormatSelectId;
  select.className = "sheets-format-select";
  sheetsRangeFormatOptions.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = getMessage(opt.labelKey);
    select.appendChild(option);
  });
  appendChildren(labelWrapper, select);

  const input = createElement("input", {
    className: "shortcut-input",
    id: `shortcut-${commandKey}`,
    type: "text",
  }) as HTMLInputElement;
  input.dataset.commandKey = commandKey;
  input.readOnly = true;
  input.setAttribute("aria-label", getMessage("userShortcuts"));

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

  appendChildren(labelWrapper, input);
  appendChildren(wrapper, labelWrapper);

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

type CreateSettingsPanelOptions = {
  onClose: () => void;
  onSave: () => void;
  getEffectiveShortcut: (commandKey: string) => Shortcut | undefined;
};

/**
 * Build the settings panel DOM and mount it under the ShadowRoot.
 *
 * The returned `panel` and `shadow` should be kept by the caller
 * for visibility toggling and form synchronization.
 *
 * @param options Callback and resolver set used while building the panel.
 * @param options.onClose Handler invoked when the close button is pressed.
 * @param options.onSave Handler invoked when the save button is pressed.
 * @param options.getEffectiveShortcut Resolver for effective shortcut by command key.
 * @returns Constructed panel element and ShadowRoot.
 */
export const createSettingsPanel = ({
  onClose,
  onSave,
  getEffectiveShortcut,
}: CreateSettingsPanelOptions) => {
  const shadow = getShadowRoot();

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
  closeBtn.addEventListener("click", onClose);
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
    if (shortcut.key === "copy-google-sheets-range") {
      const row = createSheetsRangeShortcutRow(getEffectiveShortcut);
      appendChildren(shortcutSection, row);
    } else {
      const row = createShortcutInput(
        shortcut.key,
        shortcut.label,
        getEffectiveShortcut,
      );
      appendChildren(shortcutSection, row);
    }
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
  saveBtn.addEventListener("click", onSave);
  appendChildren(panel, saveBtn);

  shadow.appendChild(panel);

  return { panel, shadow };
};

export { shortcutCommands, slackFields, DEFAULT_EMOJI_NAMES };
