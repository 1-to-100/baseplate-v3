import * as React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';

export interface NotAuthorizedProps {
  title?: string;
  message?: string;
}

export function NotAuthorized({
  title = 'Not authorized',
  message = 'You do not have permission to access this page.',
}: NotAuthorizedProps): React.JSX.Element {
  return (
    <Box sx={{ textAlign: 'center', mt: 35 }}>
      <Typography
        sx={{
          fontSize: '24px',
          fontWeight: '600',
          color: 'var(--joy-palette-text-primary)',
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: '14px',
          fontWeight: '300',
          color: 'var(--joy-palette-text-secondary)',
          mt: 1,
        }}
      >
        {message}
        <br />
        Please contact your administrator if you believe this is a mistake.
      </Typography>
    </Box>
  );
}
