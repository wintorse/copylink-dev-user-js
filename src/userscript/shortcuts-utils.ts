import type { Shortcut, ShortcutMap } from "./types";
import type { Command } from "@copylink-dev/types/types";
import { VALID_COMMANDS } from "@copylink-dev/shared/constants";
import { getUserShortcuts } from "./cache";

/**
 * Check if a value is a valid shortcut map.
 *
 * @param value Value to check.
 * @returns `true` if the value is a valid shortcut map.
 */
export const isShortcutMap = (value: unknown): value is ShortcutMap =>
  typeof value === "object" &&
  value !== null &&
  Object.values(value).every(
    (shortcut: unknown) =>
      typeof shortcut === "object" &&
      shortcut !== null &&
      "key" in shortcut &&
      typeof shortcut.key === "string" &&
      "ctrl" in shortcut &&
      typeof shortcut.ctrl === "boolean" &&
      "shift" in shortcut &&
      typeof shortcut.shift === "boolean" &&
      "alt" in shortcut &&
      typeof shortcut.alt === "boolean" &&
      "meta" in shortcut &&
      typeof shortcut.meta === "boolean",
  );

/**
 * Send the top-level shortcut map to every descendant, across origins.
 *
 * @param target Window whose descendant frames should receive the map.
 * @param shortcuts Current top-level shortcut map.
 * @param messageType Message type used for shortcut synchronization.
 */
export const syncFrameShortcuts = (
  target: Window,
  shortcuts: ShortcutMap,
  messageType: string,
) => {
  for (let index = 0; index < target.length; index += 1) {
    const frame = target.frames[index];
    frame.postMessage({ type: messageType, shortcuts }, "*");
    syncFrameShortcuts(frame, shortcuts, messageType);
  }
};

/**
 * Resolve a shortcut key without Alt-generated characters on letters/digits.
 *
 * @param event Keyboard event to normalize.
 * @returns Base key for Alt-modified letters/digits, otherwise the event key.
 */
export const getShortcutKey = (event: KeyboardEvent): string => {
  if (event.altKey) {
    if (/^Key[A-Z]$/.test(event.code)) {
      return event.code.slice(3).toLowerCase();
    }
    if (/^Digit[0-9]$/.test(event.code)) {
      return event.code.slice(5);
    }
  }
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
};

/**
 * Check whether the keyboard event matches a shortcut definition.
 *
 * @param event Keyboard event to evaluate.
 * @param shortcut Shortcut definition.
 * @returns `true` when all key/modifier values match.
 */
export const matchesShortcut = (event: KeyboardEvent, shortcut: Shortcut) => {
  const normalizedKey = shortcut.key.toLowerCase();
  return (
    (getShortcutKey(event).toLowerCase() === normalizedKey ||
      // Preserve shortcuts saved with Alt-generated characters before normalization.
      event.key.toLowerCase() === normalizedKey) &&
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
export const buildEffectiveShortcuts = (defaults: ShortcutMap): ShortcutMap => {
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
export const attachDocumentListener = (
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
export const addIframeListeners = (handler: (ev: KeyboardEvent) => void) => {
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
export const observeIframeAdditions = (
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

export const isValidCommand = (value: string): value is Command =>
  Object.values(VALID_COMMANDS).some((c) => c === value);
