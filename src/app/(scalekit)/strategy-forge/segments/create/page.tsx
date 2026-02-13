'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import { CreateSegmentForm } from '../../ui/components/create-segment-form';
import { useCanEditSegments } from '../../lib/hooks/useCanEditSegments';
import { paths } from '@/paths';

export default function CreateSegmentPage(): React.JSX.Element {
  const router = useRouter();
  const { canEditSegments, isLoading } = useCanEditSegments();

  React.useEffect(() => {
    if (!isLoading && !canEditSegments) {
      router.replace(paths.strategyForge.segments.list);
    }
  }, [canEditSegments, isLoading, router]);

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
      <CreateSegmentForm />
    </Box>
  );
}
