'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import CircularProgress from '@mui/joy/CircularProgress';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { paths } from '@/paths';
import { CreateSegmentForm } from '../../ui/components/create-segment-form';
import { getSegmentById } from '../../lib/api/segments';

interface PageProps {
  params: Promise<{
    segmentId: string;
  }>;
}

export default function EditSegmentPage({ params }: PageProps): React.JSX.Element {
  const [segmentId, setSegmentId] = React.useState<string | null>(null);

  // Handle async params
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setSegmentId(resolvedParams.segmentId);
    });
  }, [params]);

  // Fetch segment name for breadcrumbs
  const { data: segmentData, isLoading: segmentLoading } = useQuery({
    queryKey: ['segment', segmentId, 'breadcrumb'],
    queryFn: () => getSegmentById(segmentId!, { page: 1, perPage: 1 }),
    enabled: !!segmentId,
  });

  if (!segmentId) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <CircularProgress size='md' />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      {/* Breadcrumbs */}
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem href={paths.home} type='start' />
          <BreadcrumbsItem href={paths.dashboard.segments.list}>Segments</BreadcrumbsItem>
          <BreadcrumbsItem href={paths.dashboard.segments.details(segmentId)}>
            {segmentLoading ? '...' : segmentData?.segment?.name || 'Segment'}
          </BreadcrumbsItem>
          <BreadcrumbsItem type='end'>Edit segment</BreadcrumbsItem>
        </Breadcrumbs>
      </Box>

      {/* Form - fetches its own data including companies */}
      <CreateSegmentForm segmentId={segmentId} />
    </Box>
  );
}
