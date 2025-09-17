import * as React from 'react';

import { SettingsContext } from '@/contexts/settings';
import type { SettingsContextValue } from '@/contexts/settings';

export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(SettingsContext);

  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return ctx;
}
