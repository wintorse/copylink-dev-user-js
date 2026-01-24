import toastCss from "@copylink-dev/public/styles/toast.css?raw";
import {
  showToastCore,
  type ToastOptions as SharedToastOptions,
} from "@copylink-dev/shared/ui/toast";

export type ToastOptions = SharedToastOptions & {
  actionLabel?: string;
  onAction?: () => void;
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

export const showToast = (message: string, options: ToastOptions = {}) => {
  const { actionLabel, onAction, ...sharedOptions } = options;
  showToastCore(message, document, {
    ...sharedOptions,
    renderContent: (container, text) => {
      const style = document.createElement("style");
      style.textContent = `${toastCss}\n${extraButtonStyles}`;
      container.appendChild(style);

      const messageNode = document.createElement("span");
      messageNode.textContent = text;
      container.appendChild(messageNode);

      if (actionLabel && onAction) {
        const actionBtn = document.createElement("button");
        actionBtn.textContent = actionLabel;
        actionBtn.addEventListener("click", () => onAction());
        container.appendChild(actionBtn);
      }
    },
  });
};
