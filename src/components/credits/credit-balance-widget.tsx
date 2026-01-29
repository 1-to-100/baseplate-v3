'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';

import { toast } from '@/components/core/toaster';

import { useCreditBalance, useChargeCredits } from '@/lib/credits';
import { paths } from '@/paths';

export function CreditBalanceWidget(): React.JSX.Element | null {
  const { data: balance, isLoading } = useCreditBalance();
  const chargeCredits = useChargeCredits();

  const handleCharge = () => {
    if (!balance?.customer_id) return;

    chargeCredits.mutate(
      {
        customer_id: balance.customer_id,
        amount: 10,
        reason: 'Test charge',
        action_code: 'test_charge',
      },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to charge credits');
        },
      }
    );
  };

  // Don't render if no balance data (user might not have credits set up yet)
  if (isLoading || !balance) {
    return null;
  }

  const periodUsed = balance.period_used;
  const periodLimit = balance.period_limit;
  const isCharging = chargeCredits.isPending;

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
            size='sm'
            variant='soft'
            color='neutral'
            onClick={handleCharge}
            disabled={isCharging}
          >
            Charge
          </Button>
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
