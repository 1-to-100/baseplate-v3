'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Skeleton from '@mui/joy/Skeleton';
import {
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Lightning as LightningIcon,
  Warning as WarningIcon,
  ListDashes as ListDashesIcon,
} from '@phosphor-icons/react/dist/ssr';

import { ACTIVE_STATUSES, ERROR_STATUSES } from '@/types/llm-jobs';
import type { LLMJobStats, LLMJobStatus } from '@/types/llm-jobs';

interface LLMJobsStatsProps {
  stats?: LLMJobStats;
  isLoading?: boolean;
  activeStatuses?: LLMJobStatus[];
  onStatusFilter?: (statuses: LLMJobStatus[]) => void;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ size?: number; weight?: 'fill' | 'regular' }>;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  isLoading?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  isLoading,
  isActive,
  onClick,
}: StatCardProps): React.JSX.Element {
  const colorMap = {
    primary: {
      bg: 'primary.softBg',
      text: 'primary.600',
      icon: 'primary.500',
    },
    success: {
      bg: 'success.softBg',
      text: 'success.600',
      icon: 'success.500',
    },
    warning: {
      bg: 'warning.softBg',
      text: 'warning.600',
      icon: 'warning.500',
    },
    danger: {
      bg: 'danger.softBg',
      text: 'danger.600',
      icon: 'danger.500',
    },
    neutral: {
      bg: 'neutral.softBg',
      text: 'neutral.600',
      icon: 'neutral.500',
    },
  };

  const colors = colorMap[color];

  return (
    <Card
      variant='soft'
      data-testid={`stat-card-${title.toLowerCase()}`}
      data-active={isActive ? 'true' : undefined}
      sx={{
        flex: 1,
        minWidth: { xs: '140px', sm: '160px' },
        p: { xs: 1.5, sm: 2 },
        bgcolor: colors.bg,
        cursor: onClick ? 'pointer' : 'default',
        outline: isActive ? '2px solid' : 'none',
        outlineColor: isActive ? `${color}.500` : 'transparent',
        transition: 'outline 0.15s, box-shadow 0.15s',
        '&:hover': onClick
          ? {
              boxShadow: 'sm',
            }
          : {},
      }}
      onClick={onClick}
    >
      <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box sx={{ color: colors.icon, display: 'flex' }}>
          <Icon size={24} weight='fill' />
        </Box>
        <Box>
          <Typography level='body-xs' sx={{ color: colors.text, fontWeight: 500 }}>
            {title}
          </Typography>
          {isLoading ? (
            <Skeleton variant='text' width={40} height={28} />
          ) : (
            <Typography level='h3' sx={{ color: colors.text }}>
              {value.toLocaleString()}
            </Typography>
          )}
        </Box>
      </Stack>
    </Card>
  );
}

type StatCardName = 'Total' | 'Active' | 'Queued' | 'Completed' | 'Failed' | 'Cancelled';

const STATUS_GROUPS: Record<StatCardName, LLMJobStatus[]> = {
  Total: [],
  Active: ACTIVE_STATUSES,
  Queued: ['queued'],
  Completed: ['completed'],
  Failed: ERROR_STATUSES,
  Cancelled: ['cancelled'],
};

export function LLMJobsStats({
  stats,
  isLoading,
  activeStatuses = [],
  onStatusFilter,
}: LLMJobsStatsProps): React.JSX.Element {
  const sumStatuses = (statuses: LLMJobStatus[]) =>
    statuses.reduce((sum, s) => sum + (stats?.[s] ?? 0), 0);
  const activeCount = sumStatuses(ACTIVE_STATUSES);
  const failedCount = sumStatuses(ERROR_STATUSES);

  const makeClickHandler = (cardName: StatCardName) => {
    if (!onStatusFilter) return undefined;
    return () => {
      if (cardName === 'Total') {
        onStatusFilter([]);
        return;
      }
      const targetStatuses = STATUS_GROUPS[cardName] ?? [];
      const allPresent = targetStatuses.every((s) => activeStatuses.includes(s));
      if (allPresent) {
        // Remove this card's statuses from the filter
        onStatusFilter(activeStatuses.filter((s) => !targetStatuses.includes(s)));
      } else {
        // Add this card's statuses to the filter (deduplicated)
        const merged = [...new Set([...activeStatuses, ...targetStatuses])];
        onStatusFilter(merged);
      }
    };
  };

  const isCardActive = (cardName: StatCardName): boolean => {
    if (cardName === 'Total') return activeStatuses.length === 0;
    const targetStatuses = STATUS_GROUPS[cardName] ?? [];
    return targetStatuses.length > 0 && targetStatuses.every((s) => activeStatuses.includes(s));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: { xs: 1, sm: 2 },
      }}
    >
      <StatCard
        title='Total'
        value={stats?.total ?? 0}
        icon={ListDashesIcon}
        color='neutral'
        isLoading={isLoading}
        isActive={isCardActive('Total')}
        onClick={makeClickHandler('Total')}
      />
      <StatCard
        title='Active'
        value={activeCount}
        icon={LightningIcon}
        color='primary'
        isLoading={isLoading}
        isActive={isCardActive('Active')}
        onClick={makeClickHandler('Active')}
      />
      <StatCard
        title='Queued'
        value={stats?.queued ?? 0}
        icon={ClockIcon}
        color='neutral'
        isLoading={isLoading}
        isActive={isCardActive('Queued')}
        onClick={makeClickHandler('Queued')}
      />
      <StatCard
        title='Completed'
        value={stats?.completed ?? 0}
        icon={CheckCircleIcon}
        color='success'
        isLoading={isLoading}
        isActive={isCardActive('Completed')}
        onClick={makeClickHandler('Completed')}
      />
      <StatCard
        title='Failed'
        value={failedCount}
        icon={XCircleIcon}
        color='danger'
        isLoading={isLoading}
        isActive={isCardActive('Failed')}
        onClick={makeClickHandler('Failed')}
      />
      <StatCard
        title='Cancelled'
        value={stats?.cancelled ?? 0}
        icon={WarningIcon}
        color='warning'
        isLoading={isLoading}
        isActive={isCardActive('Cancelled')}
        onClick={makeClickHandler('Cancelled')}
      />
    </Box>
  );
}
