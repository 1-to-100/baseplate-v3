'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import { CreateSegmentForm } from '../../../ui/components/create-segment-form';
import { useCanEditSegments } from '../../../lib/hooks/useCanEditSegments';
import { paths } from '@/paths';

interface PageProps {
  params: Promise<{
    segmentId: string;
  }>;
}

export default function EditSegmentPage({ params }: PageProps): React.JSX.Element {
  const router = useRouter();
  const { canEditSegments, isLoading } = useCanEditSegments();
  const [segmentId, setSegmentId] = React.useState<string | null>(null);

  // Handle async params
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setSegmentId(resolvedParams.segmentId);
    });
  }, [params]);

  React.useEffect(() => {
    if (!isLoading && !canEditSegments && segmentId) {
      router.replace(paths.strategyForge.segments.details(segmentId));
    }
  }, [canEditSegments, isLoading, segmentId, router]);

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

  if (isLoading || !canEditSegments) {
    return (
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
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <CreateSegmentForm segmentId={segmentId} />
    </Box>
  );
}
