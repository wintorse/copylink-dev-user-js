import type { Shortcut, ShortcutMap } from "./types";
import { getUserShortcuts, refreshSettingsCache } from "./cache";
import type { Command } from "@copylink-dev/types/types";
import { VALID_COMMANDS } from "@copylink-dev/shared/constants";

/**
 * Check whether the keyboard event exactly matches a shortcut definition.
 *
 * @param event Keyboard event to evaluate.
 * @param shortcut Shortcut definition.
 * @returns `true` when all key/modifier values match.
 */
const matchesShortcut = (event: KeyboardEvent, shortcut: Shortcut) => {
  const normalizedKey = shortcut.key.toLowerCase();
  return (
    event.key.toLowerCase() === normalizedKey &&
    event.ctrlKey === shortcut.ctrl &&
    event.shiftKey === shortcut.shift &&
    event.altKey === shortcut.alt &&
    event.metaKey === shortcut.meta
  );
};

/**
 * Normalize a partial shortcut object into a full shortcut definition.
 *
 * @param shortcut Partial shortcut.
 * @returns Normalized shortcut with all boolean modifiers set.
 */
const normalizeShortcut = (shortcut: Partial<Shortcut>): Shortcut => ({
  key: shortcut.key ?? "",
  ctrl: Boolean(shortcut.ctrl),
  shift: Boolean(shortcut.shift),
  alt: Boolean(shortcut.alt),
  meta: Boolean(shortcut.meta),
});

/**
 * Merge default shortcuts with user-defined overrides.
 *
 * @param defaults Default shortcut map.
 * @returns Effective normalized shortcut map.
 */
const buildEffectiveShortcuts = (defaults: ShortcutMap): ShortcutMap => {
  const overrides = getUserShortcuts();
  const combined: ShortcutMap = { ...defaults };
  Object.entries(overrides).forEach(([key, value]) => {
    combined[key] = normalizeShortcut(value);
  });
  return Object.fromEntries(
    Object.entries(combined).map(([key, shortcut]) => [
      key,
      normalizeShortcut(shortcut),
    ]),
  ) as ShortcutMap;
};

/**
 * Attach a keydown listener to a document in capture phase.
 *
 * @param target Target document.
 * @param handler Keydown handler.
 * @returns Nothing.
 */
const attachDocumentListener = (
  target: Document,
  handler: (ev: KeyboardEvent) => void,
) => {
  target.addEventListener("keydown", handler, true);
};

/**
 * Attach a keydown listener to a window in capture phase.
 *
 * @param target Target window.
 * @param handler Keydown handler.
 * @returns Nothing.
 */
const attachWindowListener = (
  target: Window,
  handler: (ev: KeyboardEvent) => void,
) => {
  target.addEventListener("keydown", handler, true);
};

/**
 * Attach keydown listeners to an iframe when same-origin access is available.
 *
 * @param iframe Iframe element.
 * @param handler Keydown handler.
 * @returns Nothing.
 */
const addListenerToIframe = (
  iframe: HTMLIFrameElement,
  handler: (ev: KeyboardEvent) => void,
) => {
  try {
    if (iframe.contentDocument) {
      attachDocumentListener(iframe.contentDocument, handler);
      return;
    }
    if (iframe.contentWindow) {
      attachWindowListener(iframe.contentWindow, handler);
      return;
    }
  } catch (error) {
    console.debug("copylink-dev iframe listener skip", error);
  }
};

/**
 * Attach keydown listeners to all current iframes on the page.
 *
 * @param handler Keydown handler.
 * @returns Nothing.
 */
const addIframeListeners = (handler: (ev: KeyboardEvent) => void) => {
  const iframes = Array.from(
    document.querySelectorAll<HTMLIFrameElement>("iframe"),
  );
  iframes.forEach((iframe) => addListenerToIframe(iframe, handler));
};

/**
 * Observe DOM mutations and attach listeners to newly inserted iframes.
 *
 * @param handler Keydown handler.
 * @returns Mutation observer, or `null` if no valid root exists.
 */
const observeIframeAdditions = (
  handler: (ev: KeyboardEvent) => void,
): MutationObserver | null => {
  const target: Element | null = document.body ?? document.documentElement;
  if (target === null) {
    return null;
  }
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length === 0) {
        continue;
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLIFrameElement) {
          addListenerToIframe(node, handler);
          return;
        }
        if (!(node instanceof HTMLElement)) {
          return;
        }
        const nested = node.querySelectorAll<HTMLIFrameElement>("iframe");
        nested.forEach((iframe) => addListenerToIframe(iframe, handler));
      });
    }
  });
  observer.observe(target, { childList: true, subtree: true });
  return observer;
};

const isValidCommand = (value: string): value is Command =>
  Object.values(VALID_COMMANDS).some((c) => c === value);

/**
 * Register keyboard shortcut listeners and return a refresh controller.
 *
 * @param defaults Default shortcut map.
 * @param commandHandlers Command handlers keyed by command id.
 * @returns Controller with `refresh()` to reload effective shortcuts.
 */
export const registerShortcuts = async (
  defaults: ShortcutMap,
  commandHandlers: Record<Command, () => Promise<void>>,
) => {
  await refreshSettingsCache();
  let effective = buildEffectiveShortcuts(defaults);
  const handler = (event: KeyboardEvent) => {
    const match = Object.entries(effective).find(([, shortcut]) =>
      matchesShortcut(event, shortcut),
    );
    if (!match) {
      return;
    }
    event.preventDefault();
    const [command] = match;
    if (isValidCommand(command)) {
      commandHandlers[command]().catch(console.error);
    }
  };
  attachDocumentListener(document, handler);
  addIframeListeners(handler);
  observeIframeAdditions(handler);

  const refresh = async () => {
    await refreshSettingsCache();
    effective = buildEffectiveShortcuts(defaults);
  };

  return { refresh };
};
