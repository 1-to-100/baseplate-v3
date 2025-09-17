import * as React from 'react';
import type { Metadata } from 'next';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';

import { config } from '@/config';

export const metadata = { title: `Blank | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        <div>
          <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level="h1">
            Blank
          </Typography>
        </div>
      </Stack>
    </Box>
  );
}
