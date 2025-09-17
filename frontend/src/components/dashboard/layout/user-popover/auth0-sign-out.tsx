import * as React from 'react';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';

import { paths } from '@/paths';

export function Auth0SignOut(): React.JSX.Element {
  return (
    <ListItemButton component="a" href={paths.auth.auth0.signOut}>
      <ListItemDecorator>
        <SignOutIcon fontSize="var(--Icon-fontSize)" weight="bold" style={{ color: "var(--joy-palette-text-secondary)" }}/>
      </ListItemDecorator>
      <ListItemContent>Sign Out</ListItemContent>
    </ListItemButton>
  );
}
