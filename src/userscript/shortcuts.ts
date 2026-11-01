import {
  addIframeListeners,
  attachDocumentListener,
  buildEffectiveShortcuts,
  isShortcutMap,
  isValidCommand,
  matchesShortcut,
  observeIframeAdditions,
  syncFrameShortcuts,
} from "./shortcuts-utils";
import type { Command } from "@copylink-dev/types/types";
import { SettingsHostId } from "./constants";
import type { ShortcutMap } from "./types";
import { getUserShortcuts } from "./settings-storage";
import { isDescendantFrame } from "./frame-utils";

const commandMessageType = "copylink-dev:run-command";
const shortcutsMessageType = "copylink-dev:sync-shortcuts";
const shortcutsRequestMessageType = "copylink-dev:request-shortcuts";

/**
 * Register keyboard shortcut listeners and return a refresh controller.
 * Commands detected in frames are executed by the top-level userscript.
 *
 * @param defaults Default shortcut map.
 * @param commandHandlers Command handlers keyed by command id.
 * @returns Controller with `refresh()` to reload effective shortcuts.
 */
export const registerShortcuts = async (
  defaults: ShortcutMap,
  commandHandlers: Record<Command, () => Promise<void>>,
) => {
  let effective = buildEffectiveShortcuts(defaults, await getUserShortcuts());
  if (window === window.top) {
    window.addEventListener("message", (event: MessageEvent<unknown>) => {
      const data = event.data;
      // Ignore messages that are not relevant to this userscript.
      if (typeof data !== "object" || data === null || !("type" in data)) {
        return;
      }
      // Handle shortcut requests from frames.
      if (data.type === shortcutsRequestMessageType) {
        syncFrameShortcuts(window, effective, shortcutsMessageType);
        return;
      }
      // Handle command messages from frames.
      if (
        data.type !== commandMessageType ||
        !("command" in data) ||
        typeof data.command !== "string" ||
        !isValidCommand(data.command) ||
        !isDescendantFrame(event.source, window)
      ) {
        return;
      }
      commandHandlers[data.command]().catch(console.error);
    });
  } else {
    // Listen for messages from the top-level userscript.
    window.addEventListener("message", (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (
        event.source !== window.top ||
        typeof data !== "object" ||
        data === null ||
        !("type" in data) ||
        data.type !== shortcutsMessageType ||
        !("shortcuts" in data) ||
        !isShortcutMap(data.shortcuts)
      ) {
        return;
      }
      effective = data.shortcuts;
    });
    window.top?.postMessage({ type: shortcutsRequestMessageType }, "*");
  }
  const handler = (event: KeyboardEvent) => {
    // A frame's own userscript and its parent's iframe listener may both run.
    const settingsHost = document.getElementById(SettingsHostId);
    if (
      event.defaultPrevented ||
      (settingsHost !== null && event.composedPath().includes(settingsHost))
    ) {
      return;
    }
    const match = Object.entries(effective).find(([, shortcut]) =>
      matchesShortcut(event, shortcut),
    );
    if (!match) {
      return;
    }
    event.preventDefault();
    const [command] = match;
    if (isValidCommand(command)) {
      if (window === window.top) {
        commandHandlers[command]().catch(console.error);
      } else {
        window.top?.postMessage({ type: commandMessageType, command }, "*");
      }
    }
  };
  attachDocumentListener(document, handler);
  addIframeListeners(handler);
  observeIframeAdditions(handler);

  const refresh = async () => {
    const shortcuts = await getUserShortcuts();
    effective = buildEffectiveShortcuts(defaults, shortcuts);
    if (window === window.top) {
      syncFrameShortcuts(window, effective, shortcutsMessageType);
    }
  };

  // Managers without value-change listeners still pick up edits from other tabs.
  if (window === window.top) {
    window.addEventListener("focus", () => {
      refresh().catch(console.error);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refresh().catch(console.error);
      }
    });
  }

  // Initially sync the effective shortcuts with all frames if this is the top-level window.
  if (window === window.top) {
    syncFrameShortcuts(window, effective, shortcutsMessageType);
  }

  return { refresh };
};
