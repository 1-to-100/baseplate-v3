import * as React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';

export interface NotAuthorizedProps {
  title?: string;
  message?: string;
}

export function NotAuthorized({
  title = 'Access Denied',
  message = 'You do not have the required permissions to view this page.',
}: NotAuthorizedProps): React.JSX.Element {
  return (
    <Box sx={{ textAlign: 'center', mt: { xs: 10, sm: 20, md: 35 } }}>
      <Typography
        sx={{
          fontSize: { xs: '18px', sm: '22px', md: '24px' },
          fontWeight: '600',
          color: 'var(--joy-palette-text-primary)',
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: '12px', sm: '13px', md: '14px' },
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
