'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import { CreateSegmentForm } from '../../../ui/components/create-segment-form';

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
      <CreateSegmentForm segmentId={segmentId} />
    </Box>
  );
}
