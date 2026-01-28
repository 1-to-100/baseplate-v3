'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Minus as MinusIcon, Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr';

import { useCreditBalance, useGrantCredits, useChargeCredits } from '@/lib/credits';
import { paths } from '@/paths';

export function CreditBalanceWidget(): React.JSX.Element | null {
  const { data: balance, isLoading } = useCreditBalance();
  const grantCredits = useGrantCredits();
  const chargeCredits = useChargeCredits();

  const handleGrant = () => {
    if (!balance?.customer_id) return;

    grantCredits.mutate({
      customer_id: balance.customer_id,
      amount: 10,
      reason: 'Test grant',
      action_code: 'test_grant',
    });
  };

  const handleCharge = () => {
    if (!balance?.customer_id) return;

    chargeCredits.mutate({
      customer_id: balance.customer_id,
      amount: 10,
      reason: 'Test charge',
      action_code: 'test_charge',
    });
  };

  // Don't render if no balance data (user might not have credits set up yet)
  if (isLoading || !balance) {
    return null;
  }

  const currentCredits = balance.balance;
  const isUpdating = grantCredits.isPending || chargeCredits.isPending;

  return (
    <Stack spacing={1}>
      {/* TODO: Remove test buttons before production */}
      <Stack direction='row' spacing={1} justifyContent='center'>
        <IconButton
          size='sm'
          variant='soft'
          color='danger'
          onClick={handleCharge}
          disabled={isUpdating}
          title='Charge 10 credits (test)'
        >
          <MinusIcon />
        </IconButton>
        <IconButton
          size='sm'
          variant='soft'
          color='success'
          onClick={handleGrant}
          disabled={isUpdating}
          title='Grant 10 credits (test)'
        >
          <PlusIcon />
        </IconButton>
      </Stack>

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
            {currentCredits.toLocaleString()}
          </Typography>
          <Typography
            level='body-sm'
            sx={{
              color: 'var(--joy-palette-neutral-400)',
            }}
          >
            credits
          </Typography>
        </Stack>
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
      </Box>
    </Stack>
  );
}
