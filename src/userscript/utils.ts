import { type ToastOptions, showToast } from "./toast";
import { copyToClipboardShared } from "@copylink-dev/shared/clipboard/copyToClipboardShared";

export const copyToClipboard = async (
  text: string,
  successMessage: string,
  failureMessage: string,
  html?: string,
  toastOptions?: ToastOptions,
  fallbackElement?: HTMLElement,
) => {
  const result = await copyToClipboardShared(text, html, fallbackElement);
  await showToast(
    result.success ? successMessage : failureMessage,
    toastOptions,
  );
  return result.success;
};
