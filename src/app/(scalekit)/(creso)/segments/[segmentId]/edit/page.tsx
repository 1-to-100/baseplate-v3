'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { paths } from '@/paths';
import { CreateSegmentForm } from '../../ui/components/create-segment-form';
import { getSegmentById } from '../../lib/api/segments';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{
    segmentId: string;
  }>;
}

export default function EditSegmentPage({ params }: PageProps): React.JSX.Element {
  const router = useRouter();
  const [segmentId, setSegmentId] = React.useState<string | null>(null);

  // Handle async params
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setSegmentId(resolvedParams.segmentId);
    });
  }, [params]);

  // Fetch segment data (without pagination for edit)
  const {
    data: segmentData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['segment', segmentId, 'edit'],
    queryFn: () =>
      getSegmentById(segmentId!, {
        page: 1,
        perPage: 1, // We only need the segment data, not companies
      }),
    enabled: !!segmentId,
  });

  if (isLoading) {
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

  if (error || !segmentData?.segment) {
    return (
      <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
        <Stack spacing={3}>
          <Alert color='danger'>
            <Typography level='body-md'>
              {error instanceof Error ? error.message : 'Segment not found'}
            </Typography>
          </Alert>
          <Button
            variant='outlined'
            startDecorator={<ArrowLeftIcon size={20} />}
            onClick={() => router.push(paths.dashboard.segments.list)}
          >
            Back to Segments
          </Button>
        </Stack>
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
          <BreadcrumbsItem href={paths.dashboard.segments.details(segmentId!)}>
            {segmentData.segment.name}
          </BreadcrumbsItem>
          <BreadcrumbsItem type='end'>Edit segment</BreadcrumbsItem>
        </Breadcrumbs>
      </Box>

      {/* Form */}
      <CreateSegmentForm segmentId={segmentId!} initialSegmentData={segmentData.segment} />
    </Box>
  );
}
