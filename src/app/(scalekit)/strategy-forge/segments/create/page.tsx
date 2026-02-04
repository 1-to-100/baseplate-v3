'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import { CreateSegmentForm } from '../../ui/components/create-segment-form';

export default function CreateSegmentPage(): React.JSX.Element {
  return (
    <Box sx={{ p: { xs: 2, sm: 'var(--Content-padding)' } }}>
      <CreateSegmentForm />
    </Box>
  );
}
