/**
 * Available font sizes in pixels for typography styles
 */
export const FONT_SIZE_OPTIONS = [
  10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72,
] as const;

/**
 * Default font sizes for typography style options
 */
const DEFAULT_FONT_SIZES: Record<string, number> = {
  h1: 48,
  h2: 36,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
  body: 16,
  list: 16,
};

/**
 * Default line heights for typography style options
 */
const DEFAULT_LINE_HEIGHTS: Record<string, number> = {
  h1: 1.2,
  h2: 1.3,
  h3: 1.4,
  h4: 1.4,
  h5: 1.5,
  h6: 1.5,
  body: 1.5,
  list: 1.5,
};

/**
 * Default font weights for typography style options
 */
const DEFAULT_FONT_WEIGHTS: Record<string, string> = {
  h1: '700',
  h2: '700',
  h3: '600',
  h4: '600',
  h5: '500',
  h6: '500',
  body: '400',
  list: '400',
};

/**
 * Get the default font size for a typography style option
 */
export const getDefaultFontSize = (programmaticName: string): number => {
  return DEFAULT_FONT_SIZES[programmaticName.toLowerCase()] || 16;
};

/**
 * Get the default line height for a typography style option
 */
export const getDefaultLineHeight = (programmaticName: string): number | null => {
  return DEFAULT_LINE_HEIGHTS[programmaticName.toLowerCase()] || null;
};

/**
 * Get the default font weight for a typography style option
 */
export const getDefaultFontWeight = (programmaticName: string): string | null => {
  return DEFAULT_FONT_WEIGHTS[programmaticName.toLowerCase()] || null;
};
