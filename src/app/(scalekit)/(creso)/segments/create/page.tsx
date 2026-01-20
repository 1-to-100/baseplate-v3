'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { paths } from '@/paths';
import { CreateSegmentForm } from '../ui/components/create-segment-form';

export default function CreateSegmentPage(): React.JSX.Element {
  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      {/* Breadcrumbs */}
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem href={paths.home} type='start' />
          <BreadcrumbsItem href={paths.dashboard.segments.list}>Segments</BreadcrumbsItem>
          <BreadcrumbsItem type='end'>Create new segment</BreadcrumbsItem>
        </Breadcrumbs>
      </Box>

      {/* Form */}
      <CreateSegmentForm />
    </Box>
  );
}
