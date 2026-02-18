import type { Components, Theme } from '@mui/joy/styles';
import type { CheckboxConfig } from '../theme-config';

export function createCheckboxOverride(config?: CheckboxConfig): Components<Theme>['JoyCheckbox'] {
  // Gradient config is only applied when explicitly provided; otherwise JoyUI uses palette tokens (solidBg, solidHoverBg) from theme.json
  const checkedGradient = config?.gradients?.checked;
  const checkedHoverGradient = config?.gradients?.checkedHover;

  // Get borderRadius from config or use fallback
  const borderRadius = config?.borderRadius || 'var(--joy-radius-xs)';

  return {
    styleOverrides: {
      root: ({ ownerState }) => {
        return {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '20px',
          padding: 0,
          width: '20px',
          borderRadius,

          ...(ownerState.checked && {
            '--Icon-color': 'var(--joy-palette-common-white)',
            height: '20px',
            width: '20px',
            padding: 0,

            // Only override background when gradient config is provided; otherwise JoyUI uses palette solidBg/solidHoverBg from theme.json
            ...(checkedGradient && {
              '--variant-solidBg': checkedGradient,
              background: 'var(--variant-solidBg)',
            }),
            ...(checkedHoverGradient && {
              '--variant-solidHoverBg': checkedHoverGradient,
              '&:hover': {
                background: 'var(--variant-solidHoverBg)',
              },
            }),
          }),
        };
      },
    },
  };
}
