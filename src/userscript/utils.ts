import { copyToClipboardShared } from "@copylink-dev/shared/clipboard/copyToClipboardShared";
import { showToast, type ToastOptions } from "./toast";

export const copyToClipboard = async (
  text: string,
  successMessage: string,
  failureMessage: string,
  html?: string,
  toastOptions?: ToastOptions,
  fallbackElement?: HTMLElement,
) => {
  const result = await copyToClipboardShared(text, html, fallbackElement);
  showToast(result.success ? successMessage : failureMessage, toastOptions);
  return result.success;
};
