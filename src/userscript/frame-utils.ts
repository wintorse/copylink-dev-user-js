/**
 * Check whether a message source is a current descendant frame of a window.
 * Window identity and frame traversal are available across origins.
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
  for (let index = 0; index < target.length; index += 1) {
    const frame = target.frames[index];
    if (source === frame || isDescendantFrame(source, frame)) {
      return true;
    }
  }
  return false;
};
