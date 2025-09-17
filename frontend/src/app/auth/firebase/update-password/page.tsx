import * as React from 'react';
import type { Metadata } from 'next';
import Alert from '@mui/joy/Alert';
import Box from '@mui/joy/Box';

import { config } from '@/config';
import { UpdatePasswordForm } from '@/components/auth/firebase/update-password-form';
import { GuestGuard } from '@/components/auth/guest-guard';
import { SplitLayout } from '@/components/auth/split-layout';

export const metadata = { title: `Update password | Firebase | Auth | ${config.site.name}` } satisfies Metadata;

interface PageProps {
  searchParams: Promise<{ oobCode?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { oobCode } = await searchParams;

  if (!oobCode) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="danger">Code is required</Alert>
      </Box>
    );
  }

  return (
    <GuestGuard>
      <SplitLayout>
        <UpdatePasswordForm oobCode={oobCode} />
      </SplitLayout>
    </GuestGuard>
  );
}
