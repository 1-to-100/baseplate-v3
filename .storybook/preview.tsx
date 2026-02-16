import type { Preview } from '@storybook/nextjs';
import React from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import { CssBaseline } from '@mui/joy';
import { createThemeFromConfig } from '../src/styles/theme/create-theme-from-config';
import { DEFAULT_THEME_CONFIG } from '../src/styles/theme/theme-config';

const theme = createThemeFromConfig(DEFAULT_THEME_CONFIG);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <CssVarsProvider theme={theme}>
        <CssBaseline />
        <Story />
      </CssVarsProvider>
    ),
  ],
};

export default preview;
