import type { Components, Theme } from '@mui/joy/styles';

export const JoyCard = {
  styleOverrides: { root: { borderRadius: 'var(--joy-radius-lg)', boxShadow: 'var(--joy-shadow-xs)', display: 'flex', flexDirection: 'row' } },
} satisfies Components<Theme>['JoyCard'];
