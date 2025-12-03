'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import Box from '@mui/joy/Box';
import Tab from '@mui/joy/Tab';
import TabList from '@mui/joy/TabList';
import Tabs from '@mui/joy/Tabs';

import { paths } from '@/paths';

export function SettingsTabs(): React.JSX.Element {
  const segment = useSelectedLayoutSegment() ?? 'profile';

  return (
    <Box sx={{ display: 'flex' }}>
      <Tabs value={segment} variant="custom">
        <TabList>
          <Tab component={RouterLink} href={paths.dashboard.profile.profile} value="profile">
            Profile information
          </Tab>
          <Tab component={RouterLink} href={paths.dashboard.profile.activity} value="activity">
            Activity
          </Tab>
          {/* <Tab component={RouterLink} href={paths.dashboard.settings.billing} value="billing">
            Billing
          </Tab> */}
        </TabList>
      </Tabs>
    </Box>
  );
}
