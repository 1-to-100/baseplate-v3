import type { Components, Theme } from '@mui/joy/styles';

export const JoyIconButton = {
  styleOverrides: {
    root: ({ ownerState }) => ({
      ...(ownerState.variant === 'outlined' && { boxShadow: 'var(--joy-shadow-sm)' }),
    }),
  },
} satisfies Components<Theme>['JoyIconButton'];
