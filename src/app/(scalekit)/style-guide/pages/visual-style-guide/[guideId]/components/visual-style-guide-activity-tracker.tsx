import * as React from 'react';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';

export default function VisualStyleGuideActivityTracker(): React.JSX.Element {
  return (
    <Stack spacing={2}>
      <Typography level='title-md' color='neutral' fontWeight='md'>
        Activity
      </Typography>
      <Typography level='body-sm' color='neutral' fontWeight='sm'>
        You do not have any activity
      </Typography>
    </Stack>
  );
}
