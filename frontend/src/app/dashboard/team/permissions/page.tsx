import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { Permissions } from '@/components/dashboard/team/permissions';
import type { PermissionsGroup } from '@/components/dashboard/team/permissions';

export const metadata = { title: `Permissions | Team | Dashboard | ${config.site.name}` } satisfies Metadata;

const groups = [
  {
    name: 'Messaging Management',
    permissions: [
      { name: 'Can view message', readOnly: true, member: true, manager: true, admin: true },
      { name: 'Can send message', member: true, manager: true, admin: true },
      { name: 'Can attach files', member: true, manager: true, admin: true },
      { name: 'Can share embedded links', member: true, manager: true, admin: true },
      { name: 'Can use @everyone to notify all members', manager: true, admin: true },
    ],
  },
  {
    name: 'Channel Management',
    permissions: [
      { name: 'Can create private channels', manager: true, admin: true },
      { name: 'Can create public channels', manager: true, admin: true },
      { name: 'Can delete private channels', admin: true },
      { name: 'Can delete public channels', admin: true },
      { name: 'Can archive channels', admin: true },
      { name: 'Can manage posting permissions in channels', admin: true },
    ],
  },
] satisfies PermissionsGroup[];

export default function Page(): React.JSX.Element {
  return <Permissions groups={groups} />;
}
