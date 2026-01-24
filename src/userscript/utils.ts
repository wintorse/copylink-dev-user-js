import { showToast, type ToastOptions } from "./toast";

export const copyToClipboard = async (
  text: string,
  successMessage: string,
  failureMessage: string,
  html?: string,
  toastOptions?: ToastOptions,
  fallbackElement?: HTMLElement,
) => {
  try {
    if (navigator.clipboard) {
      if (html) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
    } else if (fallbackElement) {
      document.body.appendChild(fallbackElement);
      const range = document.createRange();
      range.selectNode(fallbackElement);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();
      }
      document.body.removeChild(fallbackElement);
    } else {
      throw new Error("Clipboard not available");
    }
    showToast(successMessage, toastOptions);
    return true;
  } catch (error) {
    console.warn(error);
    showToast(failureMessage, toastOptions);
    return false;
  }
};