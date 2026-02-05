import type { Components, Theme } from '@mui/joy/styles';

export const JoyButton = {
  styleOverrides: {
    root: ({ ownerState, theme }) => {
      // Get button config from theme if available
      const buttonGradients = {
        primary: 'linear-gradient(120deg, #282490 0%, #3F4DCF 100%)',
        primaryHover: 'linear-gradient(120deg, #1E1A6F 0%, #3439B0 100%)',
      };

      return {
        borderRadius: '20px',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--joy-palette-common-white)',
        transition: 'all 0.2s ease-in-out',

        ...(ownerState.variant === 'solid' &&
          ownerState.color === 'primary' && {
            '--variant-solidBg': buttonGradients.primary,
            '--variant-solidHoverBg': buttonGradients.primaryHover,
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
          backgroundColor: 'var(--joy-palette-neutral-100)',
          border: '1px solid var(--joy-palette-divider)',
          padding: '2px 10px',

          '&:hover': {
            backgroundColor: 'var(--joy-palette-neutral-200)',
          },
        }),

        ...(ownerState.color === 'danger' && {
          backgroundColor: 'var(--joy-palette-danger-600)',
          padding: '2px 10px',
          '&:hover': {
            backgroundColor: 'var(--joy-palette-danger-500)',
          },
        }),

        ...(ownerState.variant === 'plain' && {
          color: 'var(--joy-palette-text-secondary)',
          backgroundColor: 'transparent',
          background: 'var(--joy-palette-primary-500)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          padding: 0,
          '&:hover': {
            backgroundColor: 'transparent',
            background: 'var(--joy-palette-primary-500)',
            opacity: '0.8',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          },
          '& .MuiButton-startDecorator': {
            color: 'var(--joy-palette-primary-500)',
          },
        }),

        ...(ownerState.variant === 'outlined' && {
          borderColor: 'var(--joy-palette-divider)',
          borderRadius: '20px',
          color: 'var(--joy-palette-text-secondary)',
          padding: '7px 14px',
          '&:hover': {
            background: 'transparent',
          },
        }),
      };
    },
  },
} satisfies Components<Theme>['JoyButton'];
