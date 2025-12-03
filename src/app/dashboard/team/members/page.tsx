import * as React from 'react';
import type { Metadata } from 'next';
import RouterLink from 'next/link';
import Button from '@mui/joy/Button';
import Grid from '@mui/joy/Grid';
import Stack from '@mui/joy/Stack';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { config } from '@/config';
import { paths } from '@/paths';
import { MemberCard } from '@/components/dashboard/team/member-card';
import type { Member } from '@/components/dashboard/team/member-card';
import { MembersFilter } from '@/components/dashboard/team/members-filter';
import { MembersPagination } from '@/components/dashboard/team/members-pagination';

export const metadata = { title: `Members | Team | Dashboard | ${config.site.name}` } satisfies Metadata;

const members = [
  {
    id: 'USR-001',
    name: 'Zaid Schwartz',
    username: 'zaid',
    avatar: '/assets/avatar-1.png',
    role: 'member',
    position: 'Web Designer',
    tags: ['Design', 'Marketing'],
    status: 'online',
  },
  {
    id: 'USR-008',
    name: 'Kimberly Maestra',
    username: 'kimberly',
    avatar: '/assets/avatar-8.png',
    role: 'admin',
    position: 'CEO',
    tags: ['All'],
    status: 'online',
  },
  {
    id: 'USR-003',
    name: 'Ammar Foley',
    username: 'ammar',
    avatar: '/assets/avatar-3.png',
    role: 'readOnly',
    position: 'Marketing Coordinator',
    tags: ['Design', 'Marketing'],
    status: 'busy',
  },
  {
    id: 'USR-004',
    name: 'Pippa Wilkinson',
    username: 'pippa',
    avatar: '/assets/avatar-4.png',
    role: 'member',
    position: 'Software Tester',
    tags: ['Development'],
    status: 'away',
    pending: true,
  },
] satisfies Member[];

export default function Page(): React.JSX.Element {
  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <MembersFilter />
        <Button
          component={RouterLink}
          href={paths.dashboard.team.members.invite}
          startDecorator={<PlusIcon fontSize="var(--Icon-fontSize)" weight="bold" />}
        >
          Add Member
        </Button>
      </Stack>
      <Grid container spacing={3}>
        {members.map(
          (member): React.JSX.Element => (
            <Grid key={member.id} lg={4} md={6} xl={3} xs={12}>
              <MemberCard member={member} />
            </Grid>
          )
        )}
      </Grid>
      <MembersPagination count={members.length} page={1} rowsPerPage={5} />
    </Stack>
  );
}
