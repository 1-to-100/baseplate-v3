'use client';

import * as React from 'react';
import Chip from '@mui/joy/Chip';
import type { WebScreenshotCaptureRequest } from '../../lib/types';

type CaptureRequestStatus = WebScreenshotCaptureRequest['status'];

interface StatusChipProps {
  status: CaptureRequestStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  CaptureRequestStatus,
  { color: 'success' | 'warning' | 'danger' | 'neutral' | 'primary'; label: string }
> = {
  queued: { color: 'neutral', label: 'Queued' },
  in_progress: { color: 'primary', label: 'In Progress' },
  completed: { color: 'success', label: 'Completed' },
  failed: { color: 'danger', label: 'Failed' },
  canceled: { color: 'neutral', label: 'Canceled' },
};

export function StatusChip({ status, size = 'sm' }: StatusChipProps): React.JSX.Element {
  const config = statusConfig[status];

  return (
    <Chip size={size} variant='soft' color={config.color}>
      {config.label}
    </Chip>
  );
}
