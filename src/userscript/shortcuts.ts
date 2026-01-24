import { getUserShortcuts, refreshSettingsCache } from "./cache";
import type { Command } from "@copylink-dev/types/types";

export type Shortcut = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
};
export type ShortcutMap = Record<string, Shortcut>;

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

const normalizeShortcut = (shortcut: Partial<Shortcut>): Shortcut => ({
  key: shortcut.key ?? "",
  ctrl: Boolean(shortcut.ctrl),
  shift: Boolean(shortcut.shift),
  alt: Boolean(shortcut.alt),
  meta: Boolean(shortcut.meta),
});

// Merge default shortcuts with user-defined shortcuts
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

const attachDocumentListener = (
  target: Document,
  handler: (ev: KeyboardEvent) => void,
) => {
  target.addEventListener("keydown", handler, true);
};

const attachWindowListener = (
  target: Window,
  handler: (ev: KeyboardEvent) => void,
) => {
  target.addEventListener("keydown", handler, true);
};

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

const addIframeListeners = (handler: (ev: KeyboardEvent) => void) => {
  const iframes = Array.from(
    document.querySelectorAll<HTMLIFrameElement>("iframe"),
  );
  iframes.forEach((iframe) => addListenerToIframe(iframe, handler));
};

const observeIframeAdditions = (
  handler: (ev: KeyboardEvent) => void,
): MutationObserver | null => {
  const target = document.body || document.documentElement;
  if (!target) return null;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (!mutation.addedNodes) continue;
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLIFrameElement) {
          addListenerToIframe(node, handler);
          return;
        }
        if (!(node instanceof HTMLElement)) return;
        const nested = node.querySelectorAll<HTMLIFrameElement>("iframe");
        nested.forEach((iframe) => addListenerToIframe(iframe, handler));
      });
    }
  });
  observer.observe(target, { childList: true, subtree: true });
  return observer;
};

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
    if (!match) return;
    event.preventDefault();
    const [command] = match;
    const exec = commandHandlers[command as Command];
    if (exec) {
      exec();
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
