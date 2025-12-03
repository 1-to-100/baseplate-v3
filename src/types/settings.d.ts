import type { ColorScheme, Direction, PrimaryColor } from '@/styles/theme/types';

export interface Settings {
  colorScheme: ColorScheme;
  primaryColor: PrimaryColor;
  direction?: Direction;
}
