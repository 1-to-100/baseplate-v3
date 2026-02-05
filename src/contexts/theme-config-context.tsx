'use client';

/**
 * Context for providing theme and assets configuration throughout the app
 */

import * as React from 'react';
import type { ThemeConfig, AssetsConfig } from '@/lib/theme/theme-config';
import { DEFAULT_THEME_CONFIG, DEFAULT_ASSETS_CONFIG } from '@/lib/theme/theme-config';

export interface ThemeConfigContextValue {
  themeConfig: ThemeConfig;
  assetsConfig: AssetsConfig;
  isLoading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

const ThemeConfigContext = React.createContext<ThemeConfigContextValue | undefined>(undefined);

export interface ThemeConfigProviderProps {
  children: React.ReactNode;
  themeConfig?: ThemeConfig;
  assetsConfig?: AssetsConfig;
  isLoading?: boolean;
  error?: Error | null;
  onReload?: () => Promise<void>;
}

export function ThemeConfigProvider({
  children,
  themeConfig = DEFAULT_THEME_CONFIG,
  assetsConfig = DEFAULT_ASSETS_CONFIG,
  isLoading = false,
  error = null,
  onReload,
}: ThemeConfigProviderProps): React.JSX.Element {
  const reload = React.useCallback(async () => {
    if (onReload) {
      await onReload();
    }
  }, [onReload]);

  const value = React.useMemo(
    () => ({
      themeConfig,
      assetsConfig,
      isLoading,
      error,
      reload,
    }),
    [themeConfig, assetsConfig, isLoading, error, reload]
  );

  return <ThemeConfigContext.Provider value={value}>{children}</ThemeConfigContext.Provider>;
}

/**
 * Hook to access theme configuration context
 */
export function useThemeConfig(): ThemeConfigContextValue {
  const context = React.useContext(ThemeConfigContext);

  if (!context) {
    throw new Error('useThemeConfig must be used within a ThemeConfigProvider');
  }

  return context;
}

/**
 * Hook to access assets configuration
 */
export function useAssetsConfig(): AssetsConfig {
  const { assetsConfig } = useThemeConfig();
  return assetsConfig;
}

/**
 * Hook to get logo configuration
 */
export function useLogoConfig() {
  const { assetsConfig } = useThemeConfig();
  return assetsConfig.logo || DEFAULT_ASSETS_CONFIG.logo;
}

/**
 * Hook to get component-specific config from theme
 */
export function useComponentConfig<K extends keyof NonNullable<ThemeConfig['components']>>(
  componentName: K
): NonNullable<ThemeConfig['components']>[K] | undefined {
  const { themeConfig } = useThemeConfig();
  return themeConfig.components?.[componentName];
}
