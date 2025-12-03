import type { Preview } from '@storybook/nextjs';
import React from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import { CssBaseline } from '@mui/joy';
import { theme } from '../src/styles/theme';

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