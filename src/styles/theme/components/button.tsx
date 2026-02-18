import type { Components, Theme } from '@mui/joy/styles';
import type { ButtonConfig } from '../theme-config';

export function createButtonOverride(config?: ButtonConfig): Components<Theme>['JoyButton'] {
  // Gradient config is only applied when explicitly provided; otherwise JoyUI uses palette tokens (solidBg, solidHoverBg) from theme.json
  const primaryGradient = config?.gradients?.primary;
  const primaryHoverGradient = config?.gradients?.primaryHover;

  // Get borderRadius from config or use fallback
  const borderRadius = config?.borderRadius || 'var(--joy-radius-xl)';

  return {
    styleOverrides: {
      root: ({ ownerState }) => {
        return {
          borderRadius,
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--joy-palette-common-white)',
          transition: 'all 0.2s ease-in-out',

          ...(ownerState.variant === 'solid' &&
            ownerState.color === 'primary' && {
              boxShadow: 'var(--joy-shadow-sm)',

              // Only override background when gradient config is provided; otherwise JoyUI uses palette solidBg/solidHoverBg from theme.json
              ...(primaryGradient && {
                '--variant-solidBg': primaryGradient,
                background: 'var(--variant-solidBg)',
              }),
              ...(primaryHoverGradient && {
                '--variant-solidHoverBg': primaryHoverGradient,
                '&:hover': {
                  background: 'var(--variant-solidHoverBg)',
                },
              }),
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
            borderRadius,
            color: 'var(--joy-palette-text-secondary)',
            padding: '7px 14px',
            '&:hover': {
              background: 'transparent',
            },
          }),
        };
      },
    },
  };
}
