import type { Components, Theme } from '@mui/joy/styles';

export const JoyTable = {
  styleOverrides: {
    root: ({ ownerState }) => ({
      '--Table-headerUnderlineThickness': '1px',
      '--TableRow-stripeBackground': 'var(--joy-palette-background-level1)',
      '--TableCell-borderColor': 'var(--joy-palette-divider)',
      ...(ownerState.borderAxis === 'header' && {
        '& thead th:not([colspan])': {
          borderBottom: 'var(--Table-headerUnderlineThickness) solid var(--TableCell-borderColor)',
        },
      }),

      minWidth: 800,
      border: '1px solid var(--joy-palette-divider)',
      borderRadius: 'var(--joy-radius-sm)',
      cursor: 'pointer',
      '& thead th': {
        backgroundColor: 'var(--joy-palette-background-level1)',
        alignItems: 'center',
        verticalAlign: 'middle',
        '&:first-of-type': { borderTopLeftRadius: 'var(--joy-radius-sm)' },
        '&:last-of-type': { borderTopRightRadius: 'var(--joy-radius-sm)' },
        fontWeight: 600,
      },
      '& th, & td': {
        padding: '10px',
        alignItems: 'center',
        verticalAlign: 'middle',
        color: 'var(--joy-palette-text-tertiary)',
        fontWeight: 300,
      },
      '& tbody tr:hover': {
        backgroundColor: 'var(--joy-palette-background-level1)',
        cursor: 'pointer',
      },
    }),
  },
} satisfies Components<Theme>['JoyTable'];
