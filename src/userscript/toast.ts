import {
  type ToastOptions as SharedToastOptions,
  showToastCore,
} from "@copylink-dev/shared/ui/toast";
import toastCss from "@copylink-dev/public/styles/toast.css?raw";

export type ToastOptions = SharedToastOptions & {
  actionLabel?: string;
  openSettings?: boolean;
};

const toastMessageType = "copylink-dev:show-toast";
let onOpenSettings: (() => void) | undefined;

/**
 * Receive toast requests from frames, including cross-origin frames.
 *
 * @param openSettings Callback for the toast's settings button.
 */
export const initToastUI = (openSettings: () => void) => {
  if (window !== window.top) {
    return;
  }
  onOpenSettings = openSettings;
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (
      event.source === null ||
      event.source === window ||
      typeof data !== "object" ||
      data === null ||
      !("type" in data) ||
      data.type !== toastMessageType ||
      !("message" in data) ||
      typeof data.message !== "string"
    ) {
      return;
    }
    const options: ToastOptions = {};
    if ("durationMs" in data && typeof data.durationMs === "number") {
      options.durationMs = data.durationMs;
    }
    if ("actionLabel" in data && typeof data.actionLabel === "string") {
      options.actionLabel = data.actionLabel;
    }
    options.openSettings = "openSettings" in data && data.openSettings === true;
    showToast(data.message, options).catch(console.error);
  });
};

const extraButtonStyles = `
  .copylink-dev-toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .copylink-dev-toast button {
    margin-left: 6px;
    background-color: rgba(60, 60, 60, 0.8);
    color: #f2f2f2;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 12px;
    line-height: normal;
  }
  .copylink-dev-toast button:hover {
    background-color: rgba(80, 80, 80, 0.9);
  }
`;

export const showToast = async (
  message: string,
  options: ToastOptions = {},
) => {
  const { actionLabel, openSettings, ...sharedOptions } = options;
  // If not in the top window, post a message to the top window to show the toast.
  if (window !== window.top) {
    window.top?.postMessage(
      {
        type: toastMessageType,
        message,
        durationMs: options.durationMs,
        actionLabel,
        openSettings,
      },
      "*",
    );
    return;
  }
  await showToastCore(message, document, {
    ...sharedOptions,
    renderContent: (container, text) => {
      const style = document.createElement("style");
      style.textContent = `${toastCss}\n${extraButtonStyles}`;
      container.appendChild(style);

      const messageNode = document.createElement("span");
      messageNode.textContent = text;
      container.appendChild(messageNode);

      if (
        actionLabel !== undefined &&
        actionLabel !== "" &&
        openSettings === true
      ) {
        const actionBtn = document.createElement("button");
        actionBtn.textContent = actionLabel;
        actionBtn.addEventListener("click", () => onOpenSettings?.());
        container.appendChild(actionBtn);
      }
    },
  }).catch(console.error);
};
