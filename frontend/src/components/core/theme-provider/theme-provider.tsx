'use client';

import * as React from 'react';
import CssBaseline from '@mui/joy/CssBaseline';
import { CssVarsProvider } from '@mui/joy/styles';

import { useSettings } from '@/hooks/use-settings';
import { createTheme } from '@/styles/theme/create-theme';

import { EmotionCacheProvider } from './emotion-cache';
import { Rtl } from './rtl';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const { settings } = useSettings();

  const theme = createTheme({ primaryColor: settings.primaryColor, direction: settings.direction });

  return (
    <EmotionCacheProvider options={{ key: 'joy' }}>
      <CssVarsProvider defaultColorScheme={settings.colorScheme} defaultMode={settings.colorScheme} theme={theme}>
        <CssBaseline />
        <Rtl direction={settings.direction}>{children}</Rtl>
      </CssVarsProvider>
    </EmotionCacheProvider>
  );
}
