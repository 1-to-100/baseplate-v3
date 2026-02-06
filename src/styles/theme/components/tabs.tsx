import type { Components, Theme } from '@mui/joy/styles';

export const JoyTabs = {
  styleOverrides: {
    root: ({ ownerState }) => ({
      ...(ownerState.variant === 'custom' && {
        backgroundColor: 'transparent',
        '& .MuiTabList-root': {
          backgroundColor: 'var(--joy-palette-background-level1)',
          borderRadius: 'var(--joy-radius-xl)',
          boxShadow: 'none',
          gap: '4px',
          padding: '4px',
        },
        '& .MuiTab-root': {
          borderRadius: 'var(--joy-radius-xl)',
          flex: '1 1 auto',
          '&:after': { display: 'none' },
          '&.Mui-selected': {
            backgroundColor: 'var(--joy-palette-background-surface)',
            boxShadow: 'var(--joy-shadow-sm)',
            color: 'var(--joy-palette-text-primary)',
            border: '1px solid var(--joy-palette-divider)',
          },
          '&:not(&.Mui-selected):hover': {
            backgroundColor: 'var(--joy-palette-background-level2)',
          },
        },
      }),
    }),
  },
} satisfies Components<Theme>['JoyTabs'];
