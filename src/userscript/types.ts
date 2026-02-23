export type Shortcut = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
};

/**
 * Command-to-shortcut mapping.
 */
export type ShortcutMap = Record<string, Shortcut>;

export type SettingsController = {
  show: () => Promise<void>;
  hide: () => void;
  toggle: () => Promise<void>;
  isOpen: () => boolean;
};
