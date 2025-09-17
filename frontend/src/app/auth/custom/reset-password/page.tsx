import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { ResetPasswordForm } from '@/components/auth/custom/reset-password-form';
import { GuestGuard } from '@/components/auth/guest-guard';
import { SplitLayout } from '@/components/auth/split-layout';

export const metadata = { title: `Reset password | Custom | Auth | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <GuestGuard>
      <SplitLayout>
        <ResetPasswordForm />
      </SplitLayout>
    </GuestGuard>
  );
}
