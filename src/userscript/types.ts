export type Shortcut = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
};

export type ShortcutMap = Record<string, Shortcut>;

export type SettingsController = {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  isOpen: () => boolean;
};