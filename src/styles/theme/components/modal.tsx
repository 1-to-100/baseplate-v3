import type { Components, Theme } from '@mui/joy/styles';

export const JoyModal = {
  styleOverrides: { backdrop: { backdropFilter: 'blur(3px)' } },
} satisfies Components<Theme>['JoyModal'];
