import type { Components, Theme } from '@mui/joy/styles';
import type { CheckboxConfig } from '../theme-config';

export function createCheckboxOverride(config?: CheckboxConfig): Components<Theme>['JoyCheckbox'] {
  // Get gradients from config or use fallback gradients with CSS variables
  const checkboxGradients = {
    checked:
      config?.gradients?.checked ||
      'linear-gradient(120deg, var(--joy-palette-primary-700) 0%, var(--joy-palette-primary-400) 100%)',
    checkedHover:
      config?.gradients?.checkedHover ||
      'linear-gradient(120deg, var(--joy-palette-primary-800) 0%, var(--joy-palette-primary-500) 100%)',
  };

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
            '--variant-solidBg': checkboxGradients.checked,
            '--variant-solidHoverBg': checkboxGradients.checkedHover,
            '--Icon-color': 'var(--joy-palette-common-white)',
            background: 'var(--variant-solidBg)',
            height: '20px',
            width: '20px',
            padding: 0,

            '&:hover': {
              background: 'var(--variant-solidHoverBg)',
            },
          }),
        };
      },
    },
  };
}
