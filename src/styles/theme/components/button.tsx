import type { Components, Theme } from '@mui/joy/styles';

export const JoyButton = {
  styleOverrides: {
    root: ({ ownerState }) => ({
      borderRadius: '20px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 600,
      color: '#FFFFFF',
      transition: 'all 0.2s ease-in-out',

      ...(ownerState.variant === 'solid' &&
        ownerState.color === 'primary' && {
          '--variant-solidBg': 'linear-gradient(120deg, #282490 0%, #3F4DCF 100%)',
          '--variant-solidHoverBg': 'linear-gradient(120deg, #1E1A6F 0%, #3439B0 100%)',
          boxShadow: '0 3px 6px rgba(0,102,204,0.2)',

          background: 'var(--variant-solidBg)',

          '&:hover': {
            background: 'var(--variant-solidHoverBg)',
          },

          '&:active': {
            transform: 'scale(0.98)',
          },
        }),

      ...(ownerState.color === 'neutral' && {
        backgroundColor: 'var(--joy-palette-background-secondaryBtn)',
        border: '1px solid #E5E7EB',
        padding: '2px 10px',

        '&:hover': {
          backgroundColor: '#646872',
        },
      }),

      ...(ownerState.color === 'danger' && {
        backgroundColor: '#D3232F',
        padding: '2px 10px',
        '&:hover': {
          backgroundColor: '#DC2626',
        },
      }),

      ...(ownerState.variant === 'plain' && {
        color: 'var(--joy-palette-text-secondary)',
        backgroundColor: 'transparent',
        background: 'var(--joy-palette-background-primaryColor)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        padding: 0,
        '&:hover': {
          backgroundColor: 'transparent',
          background: 'var(--joy-palette-background-primaryColor)',
          opacity: '0.8',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        },
        '& .MuiButton-startDecorator': {
          color: 'var(--joy-palette-background-primaryColor)',
        },
      }),

      ...(ownerState.variant === 'outlined' && {
        borderColor: '#E5E7EB',
        borderRadius: '20px',
        color: 'var(--joy-palette-text-secondaryBtn)',
        padding: '7px 14px',
        '&:hover': {
          background: 'transparent',
        },
      }),
    }),
  },
} satisfies Components<Theme>['JoyButton'];
