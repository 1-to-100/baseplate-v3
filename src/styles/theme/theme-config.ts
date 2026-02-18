/**
 * Runtime theme configuration with Zod validation
 * These schemas validate the structure of theme.json and assets.json at runtime
 */

import { z } from 'zod';

// Palette color scale schema
const colorScaleSchema = z
  .object({
    50: z.string().optional(),
    100: z.string().optional(),
    200: z.string().optional(),
    300: z.string().optional(),
    400: z.string().optional(),
    500: z.string().optional(),
    600: z.string().optional(),
    700: z.string().optional(),
    800: z.string().optional(),
    900: z.string().optional(),
    950: z.string().optional(),
    solidBg: z.string().optional(),
    solidHoverBg: z.string().optional(),
    solidActiveBg: z.string().optional(),
    solidDisabledBg: z.string().optional(),
    solidColor: z.string().optional(),
    solidDisabledColor: z.string().optional(),
    softBg: z.string().optional(),
    softHoverBg: z.string().optional(),
    softActiveBg: z.string().optional(),
    softDisabledBg: z.string().optional(),
    softColor: z.string().optional(),
    softDisabledColor: z.string().optional(),
    outlinedBorder: z.string().optional(),
    outlinedHoverBg: z.string().optional(),
    outlinedActiveBg: z.string().optional(),
    outlinedDisabledBg: z.string().optional(),
    outlinedColor: z.string().optional(),
    outlinedDisabledColor: z.string().optional(),
    plainColor: z.string().optional(),
    plainHoverBg: z.string().optional(),
    plainActiveBg: z.string().optional(),
    plainDisabledBg: z.string().optional(),
    plainDisabledColor: z.string().optional(),
  })
  .passthrough()
  .optional();

// Background palette (standard Joy UI)
const backgroundPaletteSchema = z
  .object({
    body: z.string().optional(),
    surface: z.string().optional(),
    popup: z.string().optional(),
    level1: z.string().optional(),
    level2: z.string().optional(),
    level3: z.string().optional(),
    backdrop: z.string().optional(),
  })
  .passthrough()
  .optional();

// Text palette (standard Joy UI)
const textPaletteSchema = z
  .object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    tertiary: z.string().optional(),
  })
  .passthrough()
  .optional();

// Common colors (standard Joy UI)
const commonPaletteSchema = z
  .object({
    black: z.string().optional(),
    white: z.string().optional(),
  })
  .passthrough()
  .optional();

// Full palette for a color scheme
const schemePaletteSchema = z
  .object({
    primary: colorScaleSchema,
    neutral: colorScaleSchema,
    danger: colorScaleSchema,
    success: colorScaleSchema,
    warning: colorScaleSchema,
    background: backgroundPaletteSchema,
    text: textPaletteSchema,
    common: commonPaletteSchema,
    divider: z.string().optional(),
  })
  .passthrough()
  .optional();

// Color schemes (light/dark)
const colorSchemesSchema = z
  .object({
    light: z
      .object({
        palette: schemePaletteSchema,
        shadowOpacity: z.string().optional(),
      })
      .passthrough()
      .optional(),
    dark: z
      .object({
        palette: schemePaletteSchema,
        shadowOpacity: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .optional();

// Typography level definition
const typographyLevelSchema = z
  .object({
    fontFamily: z.string().optional(),
    fontSize: z.string().optional(),
    fontWeight: z.union([z.number(), z.string()]).optional(),
    lineHeight: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough()
  .optional();

// Typography configuration
const typographySchema = z
  .object({
    h1: typographyLevelSchema,
    h2: typographyLevelSchema,
    h3: typographyLevelSchema,
    h4: typographyLevelSchema,
    'title-lg': typographyLevelSchema,
    'title-md': typographyLevelSchema,
    'title-sm': typographyLevelSchema,
    'body-lg': typographyLevelSchema,
    'body-md': typographyLevelSchema,
    'body-sm': typographyLevelSchema,
    'body-xs': typographyLevelSchema,
    caption: typographyLevelSchema,
    label: typographyLevelSchema,
    button: typographyLevelSchema,
    link: typographyLevelSchema,
    quote: typographyLevelSchema,
    code: typographyLevelSchema,
  })
  .passthrough()
  .optional();

// Font family configuration
const fontFamilySchema = z
  .object({
    display: z.string().optional(),
    body: z.string().optional(),
    code: z.string().optional(),
    fallback: z.string().optional(),
  })
  .passthrough()
  .optional();

// Radius tokens
const radiusSchema = z
  .object({
    xs: z.string().optional(),
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
  })
  .passthrough()
  .optional();

// Shadow tokens
const shadowSchema = z
  .object({
    xs: z.string().optional(),
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
  })
  .passthrough()
  .optional();

// Spacing tokens
const spacingSchema = z
  .object({
    xs: z.string().optional(),
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
  })
  .passthrough()
  .optional();

// Component-specific configuration
const buttonConfigSchema = z
  .object({
    borderRadius: z.string().optional(),
    gradients: z
      .object({
        primary: z.string().optional(),
        primaryHover: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .optional();

const checkboxConfigSchema = z
  .object({
    borderRadius: z.string().optional(),
    gradients: z
      .object({
        checked: z.string().optional(),
        checkedHover: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .optional();

const componentsConfigSchema = z
  .object({
    button: buttonConfigSchema,
    checkbox: checkboxConfigSchema,
  })
  .passthrough()
  .optional();

// Main theme configuration schema
export const themeConfigSchema = z.object({
  $schema: z.string().optional(),
  meta: z
    .object({
      name: z.string().optional(),
      version: z.string().optional(),
    })
    .passthrough()
    .optional(),
  colorSchemes: colorSchemesSchema,
  typography: typographySchema,
  fontFamily: fontFamilySchema,
  radius: radiusSchema,
  shadow: shadowSchema,
  spacing: spacingSchema,
  components: componentsConfigSchema,
});

// Assets configuration schema
const logoAssetsSchema = z
  .object({
    light: z.string().optional(),
    dark: z.string().optional(),
    icon: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })
  .passthrough()
  .optional();

export const assetsConfigSchema = z.object({
  logo: logoAssetsSchema,
  favicon: z.string().optional(),
  ogImage: z.string().optional(),
  authBackground: z.string().optional(),
});

// Combined config schema
export const brandConfigSchema = z.object({
  theme: themeConfigSchema,
  assets: assetsConfigSchema,
});

// Export inferred types
export type ColorScale = z.infer<typeof colorScaleSchema>;
export type BackgroundPalette = z.infer<typeof backgroundPaletteSchema>;
export type TextPalette = z.infer<typeof textPaletteSchema>;
export type CommonPalette = z.infer<typeof commonPaletteSchema>;
export type SchemePalette = z.infer<typeof schemePaletteSchema>;
export type ColorSchemes = z.infer<typeof colorSchemesSchema>;
export type TypographyLevel = z.infer<typeof typographyLevelSchema>;
export type Typography = z.infer<typeof typographySchema>;
export type FontFamily = z.infer<typeof fontFamilySchema>;
export type Radius = z.infer<typeof radiusSchema>;
export type Shadow = z.infer<typeof shadowSchema>;
export type Spacing = z.infer<typeof spacingSchema>;
export type ButtonConfig = z.infer<typeof buttonConfigSchema>;
export type CheckboxConfig = z.infer<typeof checkboxConfigSchema>;
export type ComponentsConfig = z.infer<typeof componentsConfigSchema>;
export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type LogoAssets = z.infer<typeof logoAssetsSchema>;
export type AssetsConfig = z.infer<typeof assetsConfigSchema>;
export type BrandConfig = z.infer<typeof brandConfigSchema>;

// Default fallback configs - minimal, letting Joy UI derive most values
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  meta: {
    name: 'Default Theme',
    version: '1.0.0',
  },
  colorSchemes: {
    light: {
      palette: {
        background: {
          body: '#ffffff',
        },
        text: {
          primary: '#0B0D0E',
        },
      },
    },
    dark: {
      palette: {
        background: {
          body: '#1a1a1a',
        },
        text: {
          primary: '#d9d4d4',
        },
      },
    },
  },
  // fontFamily: {
  //   display: 'Inter, sans-serif',
  //   body: 'Be Vietnam Pro, sans-serif',
  //   code: 'Roboto Mono, monospace',
  // },
  // radius: {
  //   xs: '4px',
  //   sm: '8px',
  //   md: '12px',
  //   lg: '16px',
  //   xl: '24px',
  // },
};

export const DEFAULT_ASSETS_CONFIG: AssetsConfig = {
  logo: {
    light: '/assets/logo--light.svg',
    dark: '/assets/logo--dark.svg',
    icon: '/assets/logo--light.svg',
    width: 60,
    height: 60,
  },
  favicon: '/favicon.ico',
};
