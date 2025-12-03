import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { SignUpForm } from '@/components/auth/cognito/sign-up-form';
import { GuestGuard } from '@/components/auth/guest-guard';
import { SplitLayout } from '@/components/auth/split-layout';

export const metadata = { title: `Sign up | Cognito | Auth | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <GuestGuard>
      <SplitLayout>
        <SignUpForm />
      </SplitLayout>
    </GuestGuard>
  );
}
