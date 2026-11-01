/**
 * Find child frames, including frames inside accessible open shadow roots.
 * Cross-origin documents cannot be inspected, but their ordinary frames remain
 * available through window.frames.
 *
 * @param target Window whose immediate children should be collected.
 * @returns The currently reachable child windows without duplicates.
 */
export const getChildFrames = (target: Window): Array<Window> => {
  const frames = new Set<Window>();
  for (let index = 0; index < target.length; index += 1) {
    frames.add(target.frames[index]);
  }

  try {
    const visit = (root: Document | ShadowRoot) => {
      for (const frame of root.querySelectorAll<HTMLIFrameElement>("iframe")) {
        if (frame.contentWindow) {
          frames.add(frame.contentWindow);
        }
      }
      for (const element of root.querySelectorAll("*")) {
        if (element.shadowRoot) {
          visit(element.shadowRoot);
        }
      }
    };
    visit(target.document);
  } catch {
    // Access to a cross-origin document is blocked by the browser.
  }
  return [...frames];
};

/**
 * Check whether a message source is a current reachable descendant frame.
 *
 * @param source Source of the received message.
 * @param target Window whose descendant frames may send messages.
 * @returns `true` when the source is a current descendant frame.
 */
export const isDescendantFrame = (
  source: MessageEventSource | null,
  target: Window,
): boolean => {
  if (source === null || source === target) {
    return false;
  }
  for (const frame of getChildFrames(target)) {
    if (source === frame || isDescendantFrame(source, frame)) {
      return true;
    }
  }
  return false;
};
