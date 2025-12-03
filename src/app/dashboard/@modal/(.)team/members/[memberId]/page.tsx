import * as React from 'react';

import { MemberModal } from '@/components/dashboard/team/member-modal';

export default function Page(): React.JSX.Element {
  return (
    <MemberModal
      member={{ name: 'Zaid Schwartz', username: 'zaid', avatar: '/assets/avatar-1.png', status: 'online' }}
      open
    />
  );
}
