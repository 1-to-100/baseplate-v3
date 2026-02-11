'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import LinearProgress from '@mui/joy/LinearProgress';
import Typography from '@mui/joy/Typography';
import {
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Clock as ClockIcon,
  ArrowClockwise as ArrowClockwiseIcon,
  Pause as PauseIcon,
  Lightning as LightningIcon,
  Warning as WarningIcon,
} from '@phosphor-icons/react/dist/ssr';

import type { LLMJobStatus } from '@/hooks/use-job-status';

// =============================================================================
// Types
// =============================================================================

export interface JobStatusIndicatorProps {
  /** Current job status */
  status: LLMJobStatus | null;
  /** Whether to show a detailed progress view */
  showProgress?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom label override */
  label?: string;
}

// =============================================================================
// Status Configuration
// =============================================================================

interface StatusConfig {
  label: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  icon: React.ComponentType<{ size?: number; weight?: 'fill' | 'regular' }>;
  isLoading: boolean;
}

const STATUS_CONFIG: Record<LLMJobStatus, StatusConfig> = {
  queued: {
    label: 'Queued',
    color: 'neutral',
    icon: ClockIcon,
    isLoading: true,
  },
  running: {
    label: 'Processing',
    color: 'primary',
    icon: LightningIcon,
    isLoading: true,
  },
  waiting_llm: {
    label: 'Waiting for AI',
    color: 'primary',
    icon: PauseIcon,
    isLoading: true,
  },
  retrying: {
    label: 'Retrying',
    color: 'warning',
    icon: ArrowClockwiseIcon,
    isLoading: true,
  },
  completed: {
    label: 'Complete',
    color: 'success',
    icon: CheckCircleIcon,
    isLoading: false,
  },
  error: {
    label: 'Failed',
    color: 'danger',
    icon: XCircleIcon,
    isLoading: false,
  },
  exhausted: {
    label: 'Max Retries',
    color: 'danger',
    icon: WarningIcon,
    isLoading: false,
  },
  post_processing_failed: {
    label: 'Post-Processing Failed',
    color: 'danger',
    icon: WarningIcon,
    isLoading: false,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'neutral',
    icon: XCircleIcon,
    isLoading: false,
  },
};

// =============================================================================
// Component: JobStatusIndicator
// =============================================================================

/**
 * Visual indicator for LLM job status.
 * Shows status as a colored chip with icon and optional progress bar.
 *
 * @example
 * ```tsx
 * <JobStatusIndicator status="running" showProgress />
 * <JobStatusIndicator status="completed" size="lg" />
 * ```
 */
export function JobStatusIndicator({
  status,
  showProgress = false,
  size = 'md',
  label: customLabel,
}: JobStatusIndicatorProps): React.JSX.Element {
  if (!status) {
    return (
      <Chip size={size} color='neutral' variant='soft'>
        Unknown
      </Chip>
    );
  }

  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;
  const displayLabel = customLabel || config.label;

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Chip
        size={size}
        color={config.color}
        variant='soft'
        startDecorator={
          config.isLoading ? (
            <CircularProgress size='sm' color={config.color} />
          ) : (
            <IconComponent size={iconSize} weight='fill' />
          )
        }
        sx={config.isLoading && size === 'sm' ? { py: 0.25 } : undefined}
      >
        {displayLabel}
      </Chip>

      {showProgress && config.isLoading && (
        <LinearProgress size='sm' color={config.color} sx={{ width: '100%', maxWidth: 200 }} />
      )}
    </Box>
  );
}

// =============================================================================
// Component: JobStatusBadge (Minimal variant)
// =============================================================================

export interface JobStatusBadgeProps {
  status: LLMJobStatus | null;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Minimal status badge showing just the icon and color.
 */
export function JobStatusBadge({ status, size = 'md' }: JobStatusBadgeProps): React.JSX.Element {
  if (!status) {
    return <Box sx={{ width: 16, height: 16 }} />;
  }

  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  const colorMap = {
    primary: 'primary.500',
    success: 'success.500',
    warning: 'warning.500',
    danger: 'danger.500',
    neutral: 'neutral.500',
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colorMap[config.color],
      }}
    >
      {config.isLoading ? (
        <CircularProgress size='sm' color={config.color} />
      ) : (
        <IconComponent size={iconSize} weight='fill' />
      )}
    </Box>
  );
}

// =============================================================================
// Component: JobStatusText (Text-only variant)
// =============================================================================

export interface JobStatusTextProps {
  status: LLMJobStatus | null;
  showIcon?: boolean;
}

/**
 * Text-based status display.
 */
export function JobStatusText({ status, showIcon = true }: JobStatusTextProps): React.JSX.Element {
  if (!status) {
    return (
      <Typography level='body-sm' textColor='text.tertiary'>
        Unknown
      </Typography>
    );
  }

  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  const colorMap = {
    primary: 'primary.600',
    success: 'success.600',
    warning: 'warning.600',
    danger: 'danger.600',
    neutral: 'neutral.600',
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {showIcon && (
        <Box sx={{ color: colorMap[config.color], display: 'flex' }}>
          {config.isLoading ? (
            <CircularProgress size='sm' color={config.color} />
          ) : (
            <IconComponent size={14} weight='fill' />
          )}
        </Box>
      )}
      <Typography level='body-sm' sx={{ color: colorMap[config.color] }}>
        {config.label}
      </Typography>
    </Box>
  );
}
