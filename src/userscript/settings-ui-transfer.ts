import type { CustomRegexes, EmojiNameRecord } from "@copylink-dev/types/types";
import { copyToClipboardShared } from "@copylink-dev/shared/clipboard/copyToClipboardShared";
import { getMessage } from "./i18n";

/**
 * Clear transient transfer UI whenever saved settings are loaded.
 *
 * @param root Settings root containing the transfer controls.
 */
export const resetSettingsTransferUI = (root: ParentNode) => {
  const form = root.querySelector<HTMLFormElement>("#importGroup");
  if (form) {
    form.hidden = true;
    form.reset();
  }
  root.querySelector("#importButton")?.setAttribute("aria-expanded", "false");
  root.querySelector("#importTextarea")?.removeAttribute("aria-invalid");
  for (const id of ["exportMessage", "importMessage", "importErrorMessage"]) {
    const message = root.querySelector(`#${id}`);
    if (message) {
      message.textContent = "";
    }
  }
};

const exportSettings = async () => {
  const [emojiNames, customRegexes] = await Promise.all([
    GM.getValue<Partial<EmojiNameRecord>>("emojiNames", {}),
    GM.getValue<Partial<CustomRegexes>>("customRegexes", {}),
  ]);
  const json = JSON.stringify({ emojiNames, customRegexes }, null, 2);
  const fallback = document.createElement("p");
  fallback.textContent = json;
  return copyToClipboardShared(json, undefined, fallback);
};

/**
 * Build clipboard export and JSON import controls inside the settings panel.
 *
 * @param onImport Callback to validate, save, and apply imported settings.
 * @returns Transfer section and a method to import pending JSON before saving.
 */
export const createSettingsTransferSection = (
  onImport: (text: string) => Promise<void>,
) => {
  const section = document.createElement("section");
  section.className = "settings-transfer";
  const heading = document.createElement("h3");
  heading.textContent = getMessage("importExportSettings");
  const description = document.createElement("p");
  description.textContent = getMessage("importExportDescription");

  const actions = document.createElement("div");
  actions.className = "transfer-actions";
  const importButton = document.createElement("button");
  importButton.id = "importButton";
  importButton.type = "button";
  importButton.textContent = getMessage("importSettings");
  importButton.setAttribute("aria-expanded", "false");
  importButton.setAttribute("aria-controls", "importGroup");
  const exportButton = document.createElement("button");
  exportButton.id = "exportButton";
  exportButton.type = "button";
  exportButton.textContent = getMessage("exportSettings");
  actions.append(importButton, exportButton);

  const exportMessage = document.createElement("p");
  exportMessage.id = "exportMessage";
  exportMessage.setAttribute("role", "status");

  const form = document.createElement("form");
  form.id = "importGroup";
  form.hidden = true;
  const label = document.createElement("label");
  label.htmlFor = "importTextarea";
  label.textContent = getMessage("importJsonLabel");
  const textarea = document.createElement("textarea");
  textarea.id = "importTextarea";
  textarea.name = "settingsJson";
  textarea.rows = 9;
  textarea.spellcheck = false;
  textarea.autocapitalize = "off";
  textarea.setAttribute("autocorrect", "off");
  textarea.setAttribute("aria-describedby", "importErrorMessage");
  const confirmButton = document.createElement("button");
  confirmButton.id = "importConfirmButton";
  confirmButton.type = "submit";
  confirmButton.textContent = getMessage("importConfirmButton");
  const importMessage = document.createElement("p");
  importMessage.id = "importMessage";
  importMessage.setAttribute("role", "status");
  const errorMessage = document.createElement("p");
  errorMessage.id = "importErrorMessage";
  errorMessage.setAttribute("role", "alert");
  form.append(label, textarea, confirmButton, importMessage, errorMessage);

  importButton.addEventListener("click", () => {
    form.hidden = false;
    importButton.setAttribute("aria-expanded", "true");
    textarea.focus();
  });
  textarea.addEventListener("input", () => {
    textarea.removeAttribute("aria-invalid");
    errorMessage.textContent = "";
    importMessage.textContent = "";
  });
  const submitImport = async () => {
    if (confirmButton.disabled) {
      return false;
    }
    confirmButton.disabled = true;
    errorMessage.textContent = "";
    importMessage.textContent = "";
    try {
      await onImport(textarea.value.trim());
      textarea.value = "";
      textarea.removeAttribute("aria-invalid");
      importMessage.textContent = getMessage("importSuccess");
      return true;
    } catch {
      textarea.setAttribute("aria-invalid", "true");
      errorMessage.textContent = getMessage("importFailure");
      textarea.focus();
      return false;
    } finally {
      confirmButton.disabled = false;
    }
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitImport();
  });
  const handleExport = async () => {
    exportButton.disabled = true;
    exportMessage.textContent = "";
    try {
      const result = await exportSettings();
      exportMessage.textContent = getMessage(
        result.success ? "exportSuccess" : "exportFailure",
      );
    } catch {
      exportMessage.textContent = getMessage("exportFailure");
    } finally {
      exportButton.disabled = false;
    }
  };
  exportButton.addEventListener("click", () => {
    void handleExport();
  });

  section.append(heading, description, actions, exportMessage, form);
  return {
    section,
    importPending: () =>
      textarea.value.trim() ? submitImport() : Promise.resolve(true),
  };
};
