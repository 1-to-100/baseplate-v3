'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';

import { paths } from '@/paths';

export function Auth0SignOut(): React.JSX.Element {
  const queryClient = useQueryClient();

  const handleSignOut = React.useCallback(() => {
    // Clear all React Query cache to ensure no stale data remains
    queryClient.clear();
    
    // Navigate to Auth0 sign-out endpoint
    window.location.href = paths.auth.auth0.signOut;
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
