import type { Settings } from '@/types/settings';
import { config } from '@/config';

export function applyDefaultSettings(settings: Partial<Settings>): Settings {
  return {
    colorScheme: config.site.colorScheme,
    direction: 'ltr',
    ...settings,
  };
}
