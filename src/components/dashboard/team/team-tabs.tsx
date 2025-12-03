'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import Box from '@mui/joy/Box';
import Tab from '@mui/joy/Tab';
import TabList from '@mui/joy/TabList';
import Tabs from '@mui/joy/Tabs';

import { paths } from '@/paths';

export function TeamTabs(): React.JSX.Element {
  const segment = useSelectedLayoutSegment();

  return (
    <Box sx={{ display: 'flex' }}>
      <Tabs value={segment} variant="custom">
        <TabList>
          <Tab component={RouterLink} href={paths.dashboard.team.members.list} value="members">
            Members
          </Tab>
          <Tab component={RouterLink} href={paths.dashboard.team.permissions} value="permissions">
            Permissions
          </Tab>
        </TabList>
      </Tabs>
    </Box>
  );
}
