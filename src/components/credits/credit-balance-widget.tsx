'use client';

import { useCreditBalance } from '@/lib/credits';
import { paths } from '@/paths';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import RouterLink from 'next/link';
import * as React from 'react';

export function CreditBalanceWidget(): React.JSX.Element | null {
  const { data: balance, isLoading } = useCreditBalance();

  if (isLoading || !balance) {
    return null;
  }

  const periodUsed = balance.period_used;
  const periodLimit = balance.period_limit;

  return (
    <Stack spacing={1}>
      <Box
        sx={{
          bgcolor: 'var(--joy-palette-background-mainBg)',
          borderRadius: 'var(--joy-radius-lg)',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Stack direction='row' spacing={0.5} alignItems='baseline'>
          <Typography
            level='body-md'
            sx={{
              color: 'var(--joy-palette-primary-500)',
              fontWeight: 'lg',
            }}
          >
            {periodUsed.toLocaleString()}
          </Typography>
          <Typography
            level='body-sm'
            sx={{
              color: 'var(--joy-palette-neutral-400)',
            }}
          >
            / {periodLimit.toLocaleString()} credits
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1}>
          <Button
            component={RouterLink}
            href={paths.dashboard.profile.billing}
            size='sm'
            variant='plain'
            sx={{
              color: 'var(--joy-palette-primary-500)',
              fontWeight: 'md',
              '&:hover': {
                bgcolor: 'var(--joy-palette-primary-50)',
              },
            }}
          >
            Upgrade
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
