// import type { ColorSystemOptions } from '@mui/joy/styles/extendTheme';

// import { logger } from '@/lib/default-logger';

// import {
//   carminePink,
//   crayolaBlue,
//   gradient,
//   malachiteGreen,
//   metalicOrange,
//   palatinateBlue,
//   seaGreen,
// } from './colors';
// import type { ColorScheme, PrimaryColor } from './types';

// interface Config {
//   primaryColor: PrimaryColor;
// }

// export function colorSchemes(config: Config): Partial<Record<ColorScheme, ColorSystemOptions>> {
//   let primary = { crayolaBlue, seaGreen, palatinateBlue }[config.primaryColor];

//   if (!primary) {
//     logger.warn(`No primary color found for ${config.primaryColor}. Using palatinateBlue instead.`);
//     primary = palatinateBlue;
//   }

//   return {
//     dark: {
//       palette: {
//         background: {
//           backdrop: 'rgba(26, 72, 119, 0.9)',
//           body: 'var(--joy-palette-neutral-900)',
//           surface: 'var(--joy-palette-neutral-900)',
//           level1: 'var(--joy-palette-neutral-800)',
//           level2: 'var(--joy-palette-neutral-700)',
//           level3: 'var(--joy-palette-neutral-600)',
//           mainBg: '#1a1a1a',
//           navActiveBg: '#1a1a1a',
//           primaryColor: '#716bfd',
//           secondaryBtn: '#1a1a1a',
//         },
//         common: { black: '#000000', white: '#ffffff' },
//         danger: { ...carminePink },
//         divider: 'var(--joy-palette-neutral-700)',
//         gradient,
//         neutral: { 950: '#090a0b', outlinedBorder: 'var(--joy-palette-neutral-700)' },
//         primary: { ...primary },
//         success: { ...malachiteGreen },
//         text: {
//           primary: '#d9d4d4',
//           secondary: '#a8b0b6',
//           tertiary: 'var(--joy-palette-neutral-500)',
//           secondaryBtn: '#a8b0b6',
//           tableHeader: '#d9d4d4',
//         },
//         warning: { ...metalicOrange },
//       },
//       shadowOpacity: '0.3',
//     },
//     light: {
//       palette: {
//         background: {
//           backdrop: 'rgba(116, 124, 132, 0.4)',
//           body: 'var(--joy-palette-common-white)',
//           surface: 'var(--joy-palette-common-white)',
//           level1: 'var(--joy-palette-neutral-50)',
//           level2: 'var(--joy-palette-neutral-100)',
//           level3: 'var(--joy-palette-neutral-200)',
//           mainBg: '#F6F8FB',
//           navActiveBg: '#E9EFF8',
//           primaryColor: '#3D37DD',
//           secondaryBtn: '#F6F8FB',
//         },
//         common: { black: '#000000', white: '#ffffff' },
//         danger: { ...carminePink },
//         divider: 'var(--joy-palette-neutral-200)',
//         gradient,
//         neutral: { 950: '#090a0b', outlinedBorder: 'var(--joy-palette-neutral-200)' },
//         primary: { ...primary },
//         text: {
//           primary: '#0B0D0E',
//           secondary: '#636B74',
//           tertiary: 'var(--joy-palette-neutral-500)',
//           secondaryBtn: '#272930',
//           tableHeader: '#32383E',
//         },
//         warning: { ...metalicOrange },
//       },
//       shadowOpacity: '0.04',
//     },
//   };
// }
