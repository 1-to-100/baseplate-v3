import * as React from 'react';
import type { Metadata } from 'next';
import Divider from '@mui/joy/Divider';
import List from '@mui/joy/List';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import dayjs from 'dayjs';

import { config } from '@/config';
import { SessionItem } from '@/components/dashboard/settings/session-item';
import type { Session } from '@/components/dashboard/settings/session-item';
// import { UpdatePasswordForm } from '@/components/dashboard/settings/update-password-form';

export const metadata = { title: `Security | Settings | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <Stack divider={<Divider />} spacing={5}>
      {/* <UpdatePasswordForm /> */}
      <Stack spacing={3}>
        <div>
          <Typography level="body-sm">Activity</Typography>
        </div>
        <List sx={{ '--List-gap': '24px' }}>
          {(
            [
              {
                id: 'SES-002',
                device: 'desktop',
                agent: 'Chrome, Mac OS 116.0.5845.50',
                location: 'California, USA',
                active: true,
                createdAt: dayjs().toDate(),
              },
              {
                id: 'SES-001',
                device: 'mobile',
                agent: 'Chrome, Android 116.0.5845.51',
                location: 'Denver, USA',
                createdAt: dayjs().subtract(45, 'minute').subtract(5, 'hours').subtract(2, 'day').toDate(),
              },
            ] satisfies Session[]
          ).map(
            (session): React.JSX.Element => (
              <SessionItem key={session.id} session={session} />
            )
          )}
        </List>
      </Stack>
    </Stack>
  );
}
