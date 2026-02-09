/**
 * Convert JSON theme configuration to Joy UI theme object.
 * Expects theme.json shape: colorSchemes (light/dark with palette), typography,
 * fontFamily, radius, shadow. Optional: meta, spacing, components.
 */

import { extendTheme } from '@mui/joy/styles';
import type { Theme } from '@mui/joy/styles';
import type { ColorSystemOptions } from '@mui/joy/styles/extendTheme';
import type { ThemeConfig } from './theme-config';
import { DEFAULT_THEME_CONFIG } from './theme-config';
import { logger } from '@/lib/default-logger';
import { createComponents } from './components/components';

// Extend Joy UI types only for non-standard palette properties
declare module '@mui/joy/styles' {
  interface PaletteRange {
    950?: string;
  }
}

declare module '@mui/joy/Table' {
  interface TablePropsBorderAxisOverrides {
    header: true;
  }
}

declare module '@mui/joy/Tabs' {
  interface TabsPropsVariantOverrides {
    custom: true;
  }
}

/**
 * Build palette.text so all text components use theme.json colors.
 * Uses primary for secondary/tertiary when not defined; fallback to neutral-700 when no text in config.
 */
function buildTextPalette(
  schemeText: { primary?: string; secondary?: string; tertiary?: string } | undefined
):
  | {
      primary: string;
      secondary: string;
      tertiary: string;
    }
  | undefined {
  if (!schemeText?.primary) return undefined;
  const primary = schemeText.primary;
  return {
    primary,
    secondary: schemeText.secondary ?? primary,
    tertiary: schemeText.tertiary ?? primary,
  };
}

/**
 * Convert ThemeConfig color schemes to Joy UI ColorSystemOptions
 */
function convertColorSchemes(
  config: ThemeConfig
): Partial<Record<'light' | 'dark', ColorSystemOptions>> {
  const result: Partial<Record<'light' | 'dark', ColorSystemOptions>> = {};

  if (config.colorSchemes?.light) {
    const lightScheme = config.colorSchemes.light;
    const textPalette =
      buildTextPalette(lightScheme.palette?.text) ??
      buildTextPalette({
        primary: DEFAULT_THEME_CONFIG.colorSchemes?.light?.palette?.text?.primary!,
      });
    result.light = {
      palette: {
        ...(lightScheme.palette?.primary && { primary: lightScheme.palette.primary }),
        ...(lightScheme.palette?.neutral && { neutral: lightScheme.palette.neutral }),
        ...(lightScheme.palette?.danger && { danger: lightScheme.palette.danger }),
        ...(lightScheme.palette?.success && { success: lightScheme.palette.success }),
        ...(lightScheme.palette?.warning && { warning: lightScheme.palette.warning }),
        ...(lightScheme.palette?.background && { background: lightScheme.palette.background }),
        ...(textPalette && { text: textPalette }),
        ...(lightScheme.palette?.common && { common: lightScheme.palette.common }),
        ...(lightScheme.palette?.divider && { divider: lightScheme.palette.divider }),
      },
      ...(lightScheme.shadowOpacity && { shadowOpacity: lightScheme.shadowOpacity }),
    };
  }

  if (config.colorSchemes?.dark) {
    const darkScheme = config.colorSchemes.dark;
    const textPalette =
      buildTextPalette(darkScheme.palette?.text) ??
      buildTextPalette({
        primary: DEFAULT_THEME_CONFIG.colorSchemes?.dark?.palette?.text?.primary!,
      });
    result.dark = {
      palette: {
        ...(darkScheme.palette?.primary && { primary: darkScheme.palette.primary }),
        ...(darkScheme.palette?.neutral && { neutral: darkScheme.palette.neutral }),
        ...(darkScheme.palette?.danger && { danger: darkScheme.palette.danger }),
        ...(darkScheme.palette?.success && { success: darkScheme.palette.success }),
        ...(darkScheme.palette?.warning && { warning: darkScheme.palette.warning }),
        ...(darkScheme.palette?.background && { background: darkScheme.palette.background }),
        ...(textPalette && { text: textPalette }),
        ...(darkScheme.palette?.common && { common: darkScheme.palette.common }),
        ...(darkScheme.palette?.divider && { divider: darkScheme.palette.divider }),
      },
      ...(darkScheme.shadowOpacity && { shadowOpacity: darkScheme.shadowOpacity }),
    };
  }

  return result;
}

/**
 * Convert font family config to Joy UI format
 */
function convertFontFamily(config: ThemeConfig) {
  if (!config.fontFamily) return undefined;

  return {
    ...(config.fontFamily.body && { body: config.fontFamily.body }),
    ...(config.fontFamily.display && { display: config.fontFamily.display }),
    ...(config.fontFamily.code && { code: config.fontFamily.code }),
    ...(config.fontFamily.fallback && { fallback: config.fontFamily.fallback }),
  };
}

/**
 * Convert typography config to Joy UI format
 */
function convertTypography(config: ThemeConfig) {
  if (!config.typography) return undefined;

  const typography: Record<string, any> = {};

  // Map typography levels
  const levels = [
    'h1',
    'h2',
    'h3',
    'h4',
    'title-lg',
    'title-md',
    'title-sm',
    'body-lg',
    'body-md',
    'body-sm',
    'body-xs',
    'caption',
    'label',
    'button',
    'link',
    'quote',
    'code',
  ] as const;

  for (const level of levels) {
    if (config.typography[level]) {
      typography[level] = config.typography[level];
    }
  }

  return typography;
}

/**
 * Convert radius config to CSS variables
 */
function convertRadius(config: ThemeConfig) {
  if (!config.radius) return undefined;

  return {
    ...(config.radius.xs && { xs: config.radius.xs }),
    ...(config.radius.sm && { sm: config.radius.sm }),
    ...(config.radius.md && { md: config.radius.md }),
    ...(config.radius.lg && { lg: config.radius.lg }),
    ...(config.radius.xl && { xl: config.radius.xl }),
  };
}

/**
 * Convert shadow config to CSS variables
 */
function convertShadow(config: ThemeConfig) {
  if (!config.shadow) return undefined;

  return {
    ...(config.shadow.xs && { xs: config.shadow.xs }),
    ...(config.shadow.sm && { sm: config.shadow.sm }),
    ...(config.shadow.md && { md: config.shadow.md }),
    ...(config.shadow.lg && { lg: config.shadow.lg }),
    ...(config.shadow.xl && { xl: config.shadow.xl }),
  };
}

/**
 * Create Joy UI theme from JSON configuration
 */
export function createThemeFromConfig(config: ThemeConfig): Theme {
  logger.info('Creating theme from configuration', config.meta ?? {});

  try {
    const colorSchemes = convertColorSchemes(config);
    const fontFamily = convertFontFamily(config);
    const typography = convertTypography(config);
    const radius = convertRadius(config);
    const shadow = convertShadow(config);

    return extendTheme({
      ...(Object.keys(colorSchemes).length > 0 && { colorSchemes }),
      ...(fontFamily && { fontFamily }),
      ...(typography && { typography }),
      ...(radius && { radius }),
      ...(shadow && { shadow }),
      components: createComponents(config.components),
    });
  } catch (error) {
    logger.error('Failed to create theme from config', error);
    throw error;
  }
}

/**
 * Get component config from theme config
 */
export function getComponentConfig(config: ThemeConfig) {
  return config.components || {};
}

/**
 * Helper to access theme tokens safely
 */
export function getThemeToken(path: string, fallback?: string): string {
  // Convert path like "palette.primary.500" to CSS var "--joy-palette-primary-500"
  const cssVar = `var(--joy-${path.replace(/\./g, '-')})`;
  return fallback ? `${cssVar}, ${fallback}` : cssVar;
}
