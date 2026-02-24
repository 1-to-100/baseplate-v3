/**
 * Color usage options for palette colors (JoyUI standard)
 */
export const COLOR_USAGE_OPTION = {
  PRIMARY: 'primary',
  NEUTRAL: 'neutral',
  DANGER: 'danger',
  SUCCESS: 'success',
  WARNING: 'warning',
} as const;

export type ColorUsageOption = (typeof COLOR_USAGE_OPTION)[keyof typeof COLOR_USAGE_OPTION];

/**
 * Usage options array for UI dropdowns/selects with tooltip descriptions
 */
export const USAGE_OPTIONS = [
  {
    value: COLOR_USAGE_OPTION.PRIMARY,
    label: 'Primary',
    description:
      'This is your brand-forward accent palette. It\'s the default choice for the most important actions and emphasis states—primary CTAs, active/selected states, key highlights, and anywhere we want to guide attention to "the main thing to do."',
  },
  {
    value: COLOR_USAGE_OPTION.NEUTRAL,
    label: 'Neutral',
    description:
      'The foundation palette for everyday UI: surfaces, containers, borders, dividers, and default controls that should feel stable and readable without competing with primary actions or status signals. It\'s effectively our theme-aware "gray system" that carries most layout and hierarchy.',
  },
  {
    value: COLOR_USAGE_OPTION.DANGER,
    label: 'Danger',
    description:
      'Danger is the critical/error palette. Use it for destructive actions, blocking validation errors, failed operations, and high-severity alerts—anything that should feel urgent, risky, or "stop and fix this."',
  },
  {
    value: COLOR_USAGE_OPTION.SUCCESS,
    label: 'Success',
    description:
      'Success is the positive confirmation palette. It communicates completion and correctness—saved, verified, connected, passed checks—and should be used to reinforce confidence when something definitively worked.',
  },
  {
    value: COLOR_USAGE_OPTION.WARNING,
    label: 'Warning',
    description:
      'Warning is the caution palette. It signals potential risk or important nuance—non-blocking issues, "check this before continuing," degraded states, or confirmations with consequences—strong enough to be noticed, but not as severe as Danger.',
  },
] as const;
