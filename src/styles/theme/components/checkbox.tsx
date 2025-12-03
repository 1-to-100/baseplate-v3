import type { Components, Theme } from '@mui/joy/styles';

export const JoyCheckbox = {
  styleOverrides: {
    root: ({ ownerState, theme }) => ({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '20px',
      padding: 0,
      width: '20px',
      borderRadius: '3px',

      ...(ownerState.checked && {
        '--variant-solidBg': 'linear-gradient(120deg, #282490 0%, #3F4DCF 100%)',
        '--variant-solidHoverBg': 'linear-gradient(120deg, #1E1A6F 0%, #3439B0 100%)',
        '--Icon-color': '#FFFFFF',
        background: 'var(--variant-solidBg)',
        height: '20px',
        width: '20px',
        padding: 0,

        '&:hover': {
          background: 'var(--variant-solidHoverBg)',
        },
      }),
    }),
  },
} satisfies Components<Theme>['JoyCheckbox'];
