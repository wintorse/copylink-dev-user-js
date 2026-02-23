import type { SettingsController, Shortcut, ShortcutMap } from "./types";
import { getUserShortcuts, refreshSettingsCache } from "./cache";
import { loadSettings, saveSettings } from "./settings-ui-persistence";
import { createSettingsPanel } from "./settings-ui-dom";

export type { SettingsController } from "./types";

type DefaultsMap = ShortcutMap;

let panelElement: HTMLDivElement | null = null;
let panelShadowRoot: ShadowRoot | null = null;
let isPanelVisible = false;
let defaultsRef: DefaultsMap | null = null;
let onSavedRef: (() => void) | undefined;

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
  const userShortcuts = getUserShortcuts();
  return userShortcuts[commandKey] ?? defaultsRef?.[commandKey];
};

/**
 * Refresh settings cache, then show the settings panel.
 */
const showPanel = async () => {
  if (!panelElement) {
    return;
  }
  await refreshSettingsCache();
  loadSettings(panelShadowRoot, defaultsRef);
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
 * - Applies cached settings to the form.
 * - Calls the optional callback after save.
 *
 * @param defaults Default shortcut definitions by command.
 * @param onSaved Optional callback invoked after save completes.
 * @returns Controller for settings panel operations.
 */
export const initSettingsUI = async (
  defaults: DefaultsMap,
  onSaved?: () => void,
): Promise<SettingsController> => {
  defaultsRef = defaults;
  onSavedRef = onSaved;

  await refreshSettingsCache();

  if (!panelElement || !panelShadowRoot) {
    const created = createSettingsPanel({
      onClose: hidePanel,
      onSave: () => {
        saveSettings({
          panelShadowRoot,
          defaultsRef,
          hidePanel,
          onSaved: onSavedRef,
        }).catch(console.error);
      },
      getEffectiveShortcut,
    });
    panelElement = created.panel;
    panelShadowRoot = created.shadow;
    panelElement.style.display = "none";
    isPanelVisible = false;
  }

  loadSettings(panelShadowRoot, defaultsRef);

  return {
    show: showPanel,
    hide: hidePanel,
    toggle: togglePanel,
    isOpen: () => isPanelVisible,
  };
};
