import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import Link from 'next/link';
import { paths } from '@/paths';

export default function SegmentsPage(): React.JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Page Header */}
        <Stack
          direction='row'
          spacing={3}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <div>
            <Typography level='h2'>Segments</Typography>
            <Typography level='body-md' sx={{ color: 'text.secondary' }}>
              Manage and create company segments based on filters
            </Typography>
          </div>
          <Button
            component={Link}
            href={paths.dashboard.segments.create}
            startDecorator={<PlusIcon />}
            size='lg'
          >
            Create Segment
          </Button>
        </Stack>

        {/* Placeholder for segments table */}
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 'sm',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography level='body-md' sx={{ color: 'text.secondary' }}>
            Segments list will be displayed here
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
