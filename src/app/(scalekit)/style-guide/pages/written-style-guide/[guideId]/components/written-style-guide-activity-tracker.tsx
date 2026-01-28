import * as React from 'react';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Divider from '@mui/joy/Divider';

export default function WrittenStyleGuideActivityTracker(): React.JSX.Element {
  return (
    <Stack spacing={2}>
      <Typography level='title-sm'>Activity</Typography>
      <Divider />
      <Typography level='body-sm' color='neutral'>
        No recent activity
      </Typography>
    </Stack>
  );
}
