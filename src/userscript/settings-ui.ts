import type { SettingsController, Shortcut, ShortcutMap } from "./types";
import {
  importSettings,
  loadSettings,
  saveSettings,
} from "./settings-ui-persistence";
import { createSettingsPanel } from "./settings-ui-dom";
import { getSettings } from "./settings-storage";

export type { SettingsController } from "./types";

type DefaultsMap = ShortcutMap;

let panelElement: HTMLDivElement | null = null;
let panelShadowRoot: ShadowRoot | null = null;
let isPanelVisible = false;
let defaultsRef: DefaultsMap | null = null;
let onSavedRef: (() => void) | undefined;
let panelShortcuts: ShortcutMap = {};

/**
 * Synchronize the public visibility flag from the panel element's display state.
 */
const updateVisibilityState = () => {
  if (!panelElement) {
    return;
  }
  isPanelVisible = panelElement.style.display !== "none";
};

/**
 * Resolve the effective shortcut for the given command.
 * User-defined settings take precedence over defaults.
 *
 * @param commandKey Command key.
 * @returns Effective shortcut, or `undefined` if not available.
 */
const getEffectiveShortcut = (commandKey: string): Shortcut | undefined => {
  return panelShortcuts[commandKey] ?? defaultsRef?.[commandKey];
};

/**
 * Read current settings, then show the settings panel.
 */
const showPanel = async () => {
  if (!panelElement) {
    return;
  }
  const settings = await getSettings();
  panelShortcuts = settings.userShortcuts;
  loadSettings(panelShadowRoot, defaultsRef, settings);
  panelElement.style.display = "block";
  updateVisibilityState();
};

/**
 * Hide the settings panel.
 */
const hidePanel = () => {
  if (!panelElement) {
    return;
  }
  panelElement.style.display = "none";
  updateVisibilityState();
};

/**
 * Toggle the settings panel visibility.
 */
const togglePanel = async () => {
  if (isPanelVisible) {
    hidePanel();
  } else {
    await showPanel();
  }
};

/**
 * Initialize the settings UI and return a controller for external operations.
 *
 * - Builds the settings panel in Shadow DOM on first call only.
 * - Loads current settings when the panel is shown.
 * - Calls the optional callback after save.
 *
 * @param defaults Default shortcut definitions by command.
 * @param onSaved Optional callback invoked after save completes.
 * @returns Controller for settings panel operations.
 */
export const initSettingsUI = (
  defaults: DefaultsMap,
  onSaved?: () => void,
): SettingsController => {
  defaultsRef = defaults;
  onSavedRef = onSaved;

  if (!panelElement || !panelShadowRoot) {
    const created = createSettingsPanel({
      onClose: hidePanel,
      onImport: async (text) => {
        if (panelShadowRoot) {
          await importSettings(text, panelShadowRoot);
        }
      },
      onSave: (importedSettings) =>
        saveSettings({
          importedSettings,
          panelShadowRoot,
          defaultsRef,
          hidePanel,
          onSaved: onSavedRef,
        }),
      getEffectiveShortcut,
    });
    panelElement = created.panel;
    panelShadowRoot = created.shadow;
    panelElement.style.display = "none";
    isPanelVisible = false;
  }

  return {
    show: showPanel,
    hide: hidePanel,
    toggle: togglePanel,
    isOpen: () => isPanelVisible,
  };
};
