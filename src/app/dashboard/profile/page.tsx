import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { UpdateProfileForm } from '@/components/dashboard/settings/update-profile-form';

export const metadata = { title: `Profile | Settings | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <UpdateProfileForm />;
}
