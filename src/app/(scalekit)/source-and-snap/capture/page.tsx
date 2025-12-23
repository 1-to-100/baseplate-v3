'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import { WebCaptureForm } from '../ui/screens';

export default function CapturePage(): React.JSX.Element {
  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <WebCaptureForm />
    </Box>
  );
}

