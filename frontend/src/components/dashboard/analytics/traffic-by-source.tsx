import * as React from 'react';
import Image from 'next/image';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';

const logos = {
  facebook: '/assets/logo-facebook.svg',
  google: '/assets/logo-google.svg',
  linkedin: '/assets/logo-linkedin.svg',
  twitter: '/assets/logo-twitter.svg',
} as Record<string, string>;

export interface TrafficBySourceProps {
  data: { name: string; value: number; icon: string }[];
}

export function TrafficBySource({ data = [] }: TrafficBySourceProps): React.JSX.Element {
  return (
    <Card>
      <Typography level="h4">Traffic by Source</Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {data.map((entry): React.JSX.Element => {
          const logo = logos[entry.icon];

          return (
            <Card key={entry.name} sx={{ p: 3 }}>
              <Stack spacing={1} sx={{ alignItems: 'center' }}>
                {logo ? (
                  <Image alt="" height={32} src={logo} width={32} />
                ) : (
                  <Box sx={{ bgcolor: 'var(--joy-palette-background-level1)', height: '32px', width: '32px' }} />
                )}
                <div>
                  <Typography level="h4" textAlign="center">
                    {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(entry.value)}
                  </Typography>
                  <Typography level="body-sm" textAlign="center">
                    {entry.name}
                  </Typography>
                </div>
              </Stack>
            </Card>
          );
        })}
      </Box>
    </Card>
  );
}
