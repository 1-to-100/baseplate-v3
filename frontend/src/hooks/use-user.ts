import * as React from 'react';

import type { UserContextValue } from '@/contexts/auth/types';
import { UserContext } from '@/contexts/auth/user-context';

export function useUser(): UserContextValue {
  const ctx = React.useContext(UserContext);

  if (!ctx) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return ctx;
}
