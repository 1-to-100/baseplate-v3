'use client';

import * as React from 'react';
import CssBaseline from '@mui/joy/CssBaseline';
import { CssVarsProvider } from '@mui/joy/styles';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';

import { useSettings } from '@/hooks/use-settings';
import { fetchBrandConfig, reloadBrandConfig } from '@/lib/theme/fetch-theme';
import { createThemeFromConfig } from '@/lib/theme/create-theme-from-config';
import { ThemeConfigProvider } from '@/contexts/theme-config-context';
import type { ThemeConfig, AssetsConfig } from '@/lib/theme/theme-config';
import { DEFAULT_THEME_CONFIG } from '@/lib/theme/theme-config';
import { logger } from '@/lib/default-logger';
import { EmotionCacheProvider } from './emotion-cache';
import { Rtl } from './rtl';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const { settings } = useSettings();
  const [brandConfig, setBrandConfig] = React.useState<{
    theme: ThemeConfig;
    assets: AssetsConfig;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Fetch brand configuration on mount
  React.useEffect(() => {
    let isMounted = true;

    async function loadBrandConfig() {
      try {
        setIsLoading(true);
        setError(null);
        const config = await fetchBrandConfig();

        if (isMounted) {
          setBrandConfig(config);
          logger.info('Brand configuration loaded successfully');
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error('Failed to load brand config');
          setError(error);
          logger.error('Failed to load brand configuration', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBrandConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle reload
  const handleReload = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const config = await reloadBrandConfig();
      setBrandConfig(config);
      logger.info('Brand configuration reloaded successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reload brand config');
      setError(error);
      logger.error('Failed to reload brand configuration', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create theme from brand config or use default config
  const theme = React.useMemo(() => {
    const themeConfig = brandConfig?.theme || DEFAULT_THEME_CONFIG;
    try {
      return createThemeFromConfig(themeConfig);
    } catch (err) {
      logger.error('Failed to create theme, using default config', err);
      // Last resort fallback to DEFAULT_THEME_CONFIG
      return createThemeFromConfig(DEFAULT_THEME_CONFIG);
    }
  }, [brandConfig]);

  // Show loading state while fetching initial config
  if (isLoading && !brandConfig) {
    return (
      <EmotionCacheProvider options={{ key: 'joy' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f5f5f5',
          }}
        >
          <CircularProgress />
        </Box>
      </EmotionCacheProvider>
    );
  }

  return (
    <EmotionCacheProvider options={{ key: 'joy' }}>
      <ThemeConfigProvider
        themeConfig={brandConfig?.theme}
        assetsConfig={brandConfig?.assets}
        isLoading={isLoading}
        error={error}
        onReload={handleReload}
      >
        <CssVarsProvider
          defaultColorScheme={settings.colorScheme}
          defaultMode={settings.colorScheme}
          theme={theme}
        >
          <CssBaseline />
          <Rtl direction={settings.direction}>{children}</Rtl>
        </CssVarsProvider>
      </ThemeConfigProvider>
    </EmotionCacheProvider>
  );
}
