import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { GuestGuard } from '@/components/auth/guest-guard';
import { SplitLayout } from '@/components/auth/split-layout';
import { SSOForm } from '@/components/auth/firebase/sso-form';

export const metadata = { title: `Sso | Firebase | Auth | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <GuestGuard>
      <SplitLayout>
        <SSOForm />
      </SplitLayout>
    </GuestGuard>
  );
}
