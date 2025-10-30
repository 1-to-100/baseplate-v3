'use client';

import * as React from 'react';
import { signOut } from '@aws-amplify/auth';
import { useQueryClient } from '@tanstack/react-query';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';

import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

export function CognitoSignOut(): React.JSX.Element {
  const queryClient = useQueryClient();

  const handleSignOut = React.useCallback(async (): Promise<void> => {
    try {
      await signOut();
      
      // Clear all React Query cache to ensure no stale data remains
      queryClient.clear();
      
      // UserProvider will handle Router refresh
      // After refresh, GuestGuard will handle the redirect
    } catch (err) {
      logger.error('Sign out error', err);
      toast.error('Something went wrong, unable to sign out');
    }
  }, [queryClient]);

  return (
    <ListItemButton onClick={handleSignOut}>
      <ListItemDecorator>
        <SignOutIcon fontSize="var(--Icon-fontSize)" weight="bold" style={{ color: "var(--joy-palette-text-secondary)" }}/>
      </ListItemDecorator>
      <ListItemContent>Sign Out</ListItemContent>
    </ListItemButton>
  );
}
