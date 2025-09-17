'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Avatar from '@mui/joy/Avatar';
import Badge from '@mui/joy/Badge';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import IconButton from '@mui/joy/IconButton';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { Lightning as LightningIcon } from '@phosphor-icons/react/dist/ssr/Lightning';

import type { User } from '@/types/user';
import { paths } from '@/paths';

const user = {
  id: 'USR-000',
  avatar: '/assets/avatar.png',
  firstName: 'Rene',
  lastName: 'Wells',
  email: 'rene@devias.io',
  plan: 'starter',
} satisfies User & { plan: 'basic' | 'starter' | 'pro' };

const planMapping = {
  basic: { label: 'Basic', color: 'neutral' },
  starter: { label: 'Starter', color: 'success' },
  pro: { label: 'Pro', color: 'primary' },
} as const;

export interface CurrentUserProps {
  onNavigate?: () => void;
}

export function CurrentUser({ onNavigate }: CurrentUserProps): React.JSX.Element {
  const plan = planMapping[user.plan] ?? { label: 'Unknown', color: 'neutral' };

  return (
    <Box
      sx={{
        bgcolor: 'var(--joy-palette-neutral-800)',
        borderRadius: 'var(--joy-radius-md)',
        color: 'var(--joy-palette-common-white)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Badge
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          color="success"
          sx={{
            '--Badge-ringColor': 'var(--joy-palette-neutral-900)',
            '& .MuiBadge-badge': { bottom: '4px', right: '4px' },
          }}
        >
          <Avatar src={user.avatar} />
        </Badge>
        <Box sx={{ flex: '1 1 auto' }}>
          <Typography fontWeight="lg" textColor="inherit">
            {user.firstName} {user.lastName}
          </Typography>
          <Typography level="body-xs" textColor="neutral.500">
            {user.email}
          </Typography>
        </Box>
        <Chip color={plan.color} size="sm" variant="soft">
          {plan.label}
        </Chip>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box sx={{ flex: '1 1 auto' }}>
          {user.plan === 'starter' ? (
            <Button
              color="neutral"
              component={RouterLink}
              href={paths.dashboard.profile.billing}
              onClick={onNavigate}
              size="sm"
              startDecorator={<LightningIcon fontSize="var(--Icon-fontSize)" weight="bold" />}
              sx={{
                '--variant-outlinedActiveBg': 'var(--joy-palette-neutral-900)',
                '--variant-outlinedBorder': 'var(--joy-palette-neutral-700)',
                '--variant-outlinedColor': 'var(--joy-palette-common-white)',
                '--variant-outlinedHoverBg': 'var(--joy-palette-neutral-700)',
                width: '100%',
              }}
              variant="outlined"
            >
              Upgrade to Pro
            </Button>
          ) : null}
        </Box>
        <IconButton
          color="neutral"
          component={RouterLink}
          href={paths.dashboard.profile.profile}
          onClick={onNavigate}
          size="sm"
          sx={{
            '--variant-outlinedActiveBg': 'var(--joy-palette-neutral-900)',
            '--variant-outlinedBorder': 'var(--joy-palette-neutral-700)',
            '--variant-outlinedColor': 'var(--joy-palette-common-white)',
            '--variant-outlinedHoverBg': 'var(--joy-palette-neutral-700)',
          }}
          variant="outlined"
        >
          <GearSixIcon fontSize="var(--Icon-fontSize)" weight="bold" />
        </IconButton>
      </Stack>
    </Box>
  );
}
