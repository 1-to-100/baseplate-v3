/**
 * Color usage options for palette colors
 */
export const COLOR_USAGE_OPTION = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  FOREGROUND: 'foreground',
  BACKGROUND: 'background',
  ACCENT: 'accent',
} as const;

export type ColorUsageOption = (typeof COLOR_USAGE_OPTION)[keyof typeof COLOR_USAGE_OPTION];

/**
 * Usage options array for UI dropdowns/selects
 */
export const USAGE_OPTIONS = [
  { value: COLOR_USAGE_OPTION.PRIMARY, label: 'Primary' },
  { value: COLOR_USAGE_OPTION.SECONDARY, label: 'Secondary' },
  { value: COLOR_USAGE_OPTION.FOREGROUND, label: 'Foreground' },
  { value: COLOR_USAGE_OPTION.BACKGROUND, label: 'Background' },
  { value: COLOR_USAGE_OPTION.ACCENT, label: 'Accent' },
] as const;
