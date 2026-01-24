const toastHostId = "copylink-dev-toast-host";
const toastStyleText = `
  #copylink-dev-toast {
    position: fixed;
    bottom: 24px;
    left: 24px;
    padding: 14px 16px;
    max-height: calc(100% - 48px);
    max-width: 568px;
    min-height: 20px;
    border-radius: 4px;
    background-color: rgb(30, 30, 30);
    box-shadow: 0 4px 8px 3px rgba(60, 64, 67, .15);
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    font-size: 14px;
    font-weight: 400;
    text-align: left;
    color: #f2f2f2;
    z-index: 20000;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    opacity: 0;
    transform: translate3d(0, 24px, 0);
  }

  #copylink-dev-toast.visible {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  #copylink-dev-toast button {
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

  #copylink-dev-toast button:hover {
    background-color: rgba(80, 80, 80, 0.9);
  }
`;

const getMountNode = () => document.body || document.documentElement;

const ensureToastRoot = () => {
  const mount = getMountNode();
  let host = document.getElementById(toastHostId);
  if (!host) {
    host = document.createElement("div");
    host.id = toastHostId;
    mount.appendChild(host);
  }
  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
  return { host, shadow };
};

export type ToastOptions = {
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

export const showToast = (message: string, options: ToastOptions = {}) => {
  const existing = document.getElementById("copylink-dev-toast");
  if (existing) {
    existing.remove();
  }
  const { shadow } = ensureToastRoot();
  const style = document.createElement("style");
  style.textContent = toastStyleText;
  const wrapper = document.createElement("div");
  wrapper.id = "copylink-dev-toast";
  wrapper.textContent = message;

  if (options.actionLabel && options.onAction) {
    const actionBtn = document.createElement("button");
    actionBtn.textContent = options.actionLabel;
    actionBtn.addEventListener("click", () => options.onAction?.());
    wrapper.appendChild(actionBtn);
  }

  shadow.appendChild(style);
  shadow.appendChild(wrapper);

  // slide in and fade in
  requestAnimationFrame(() => {
    wrapper.classList.add("visible");
  });
  const duration = options.durationMs ?? 3000;

  // slide out and fade out
  setTimeout(() => {
    wrapper.classList.remove("visible");

    setTimeout(() => {
      style.remove();
      wrapper.remove();
    }, 200);
  }, duration);
};
