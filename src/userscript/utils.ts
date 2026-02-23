import { type ToastOptions, showToast } from "./toast";
import { copyToClipboardShared } from "@copylink-dev/shared/clipboard/copyToClipboardShared";

/**
 * Copy text/html to clipboard and show a success or failure toast.
 *
 * @param text Plain text to copy.
 * @param successMessage Toast message when copy succeeds.
 * @param failureMessage Toast message when copy fails.
 * @param html Optional HTML payload.
 * @param toastOptions Optional toast configuration.
 * @param fallbackElement Optional fallback element used by copy logic.
 * @returns `true` when copy succeeded.
 */
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
