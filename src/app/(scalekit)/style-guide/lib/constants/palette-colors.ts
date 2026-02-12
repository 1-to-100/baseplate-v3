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
  {
    value: COLOR_USAGE_OPTION.PRIMARY,
    label: 'Primary Color',
    description: 'The main brand color used for key UI elements like buttons and links',
  },
  {
    value: COLOR_USAGE_OPTION.SECONDARY,
    label: 'Secondary Color',
    description: 'A complementary color used to support the primary color',
  },
  {
    value: COLOR_USAGE_OPTION.FOREGROUND,
    label: 'Text Color',
    description: 'Sets the color of text content on the page',
  },
  {
    value: COLOR_USAGE_OPTION.BACKGROUND,
    label: 'Background Color',
    description: 'Sets the background color of pages and sections',
  },
  {
    value: COLOR_USAGE_OPTION.ACCENT,
    label: 'Accent Color',
    description: 'A highlight color used to draw attention to specific elements',
  },
] as const;
