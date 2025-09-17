'use client';

import * as React from 'react';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import type { Auth } from 'firebase/auth';
import { signOut } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/auth/firebase/client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

export function FirebaseSignOut(): React.JSX.Element {
  const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    try {
      await signOut(firebaseAuth);
      // UserProvider will handle Router refresh
      // After refresh, GuestGuard will handle the redirect
    } catch (err) {
      logger.error('Sign out error', err);
      toast.error('Something went wrong, unable to sign out');
    }
  }, [firebaseAuth]);

  return (
    <ListItemButton onClick={handleSignOut}>
      <ListItemDecorator>
        <SignOutIcon fontSize="var(--Icon-fontSize)" weight="bold" style={{ color: "var(--joy-palette-text-secondary)" }}/>
      </ListItemDecorator>
      <ListItemContent>Sign Out</ListItemContent>
    </ListItemButton>
  );
}
