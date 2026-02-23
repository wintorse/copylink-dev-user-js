import type { ShortcutMap } from "./types";

export const isMac = /Mac/.test(navigator.userAgent);

export const defaultShortcuts: ShortcutMap = isMac
  ? {
      "copy-link": {
        key: "l",
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
      },
      "copy-link-for-slack": {
        key: "l",
        ctrl: true,
        shift: true,
        alt: false,
        meta: false,
      },
      "copy-title": {
        key: "t",
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
      },
      "copy-google-sheets-range": {
        key: "r",
        ctrl: true,
        shift: false,
        alt: false,
        meta: false,
      },
    }
  : {
      "copy-link": {
        key: "l",
        ctrl: false,
        shift: false,
        alt: true,
        meta: false,
      },
      "copy-link-for-slack": {
        key: "l",
        ctrl: false,
        shift: true,
        alt: true,
        meta: false,
      },
      "copy-title": {
        key: "t",
        ctrl: false,
        shift: false,
        alt: true,
        meta: false,
      },
      "copy-google-sheets-range": {
        key: "r",
        ctrl: false,
        shift: false,
        alt: true,
        meta: false,
      },
    };
