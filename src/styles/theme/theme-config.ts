/**
 * Type definitions for runtime theme configuration
 * These types match the structure of theme.json and assets.json
 */

// Palette color scale
export interface ColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500?: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  950?: string;
  solidBg?: string;
  solidColor?: string;
  softBg?: string;
  softColor?: string;
  outlinedBorder?: string;
  outlinedColor?: string;
  plainColor?: string;
}

// Background palette (standard Joy UI)
export interface BackgroundPalette {
  body?: string;
  surface?: string;
  popup?: string;
  level1?: string;
  level2?: string;
  level3?: string;
  backdrop?: string;
}

// Text palette (standard Joy UI)
export interface TextPalette {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

// Common colors (standard Joy UI)
export interface CommonPalette {
  black?: string;
  white?: string;
}

// Full palette for a color scheme
export interface SchemePalette {
  primary?: ColorScale;
  neutral?: ColorScale;
  danger?: ColorScale;
  success?: ColorScale;
  warning?: ColorScale;
  background?: BackgroundPalette;
  text?: TextPalette;
  common?: CommonPalette;
  divider?: string;
}

// Color schemes (light/dark)
export interface ColorSchemes {
  light?: {
    palette?: SchemePalette;
    shadowOpacity?: string;
  };
  dark?: {
    palette?: SchemePalette;
    shadowOpacity?: string;
  };
}

// Typography level definition
export interface TypographyLevel {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number | string;
  lineHeight?: number | string;
}

// Typography configuration
export interface Typography {
  h1?: TypographyLevel;
  h2?: TypographyLevel;
  h3?: TypographyLevel;
  h4?: TypographyLevel;
  'title-lg'?: TypographyLevel;
  'title-md'?: TypographyLevel;
  'title-sm'?: TypographyLevel;
  'body-lg'?: TypographyLevel;
  'body-md'?: TypographyLevel;
  'body-sm'?: TypographyLevel;
  'body-xs'?: TypographyLevel;
  caption?: TypographyLevel;
  label?: TypographyLevel;
  button?: TypographyLevel;
  link?: TypographyLevel;
  quote?: TypographyLevel;
  code?: TypographyLevel;
}

// Font family configuration
export interface FontFamily {
  display?: string;
  body?: string;
  code?: string;
  fallback?: string;
}

// Radius tokens
export interface Radius {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

// Shadow tokens
export interface Shadow {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

// Spacing tokens
export interface Spacing {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

// Component-specific configuration
export interface ButtonConfig {
  borderRadius?: string;
  gradients?: {
    primary?: string;
    primaryHover?: string;
  };
}

export interface CheckboxConfig {
  borderRadius?: string;
  gradients?: {
    checked?: string;
    checkedHover?: string;
  };
}

export interface ComponentsConfig {
  button?: ButtonConfig;
  checkbox?: CheckboxConfig;
}

// Main theme configuration
export interface ThemeConfig {
  $schema?: string;
  meta?: {
    name?: string;
    version?: string;
  };
  colorSchemes?: ColorSchemes;
  typography?: Typography;
  fontFamily?: FontFamily;
  radius?: Radius;
  shadow?: Shadow;
  spacing?: Spacing;
  components?: ComponentsConfig;
}

// Assets configuration
export interface LogoAssets {
  light?: string;
  dark?: string;
  icon?: string;
  width?: number;
  height?: number;
}

export interface AssetsConfig {
  logo?: LogoAssets;
  favicon?: string;
  ogImage?: string;
  authBackground?: string;
}

// Combined config
export interface BrandConfig {
  theme: ThemeConfig;
  assets: AssetsConfig;
}

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
