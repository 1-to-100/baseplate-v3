import type { Components, Theme } from '@mui/joy/styles';

export const JoyCheckbox = {
  styleOverrides: {
    root: ({ ownerState, theme }) => {
      // Get checkbox config from theme if available
      const checkboxGradients = {
        checked: 'linear-gradient(120deg, #282490 0%, #3F4DCF 100%)',
        checkedHover: 'linear-gradient(120deg, #1E1A6F 0%, #3439B0 100%)',
      };

      return {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '20px',
        padding: 0,
        width: '20px',
        borderRadius: '3px',

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
} satisfies Components<Theme>['JoyCheckbox'];
