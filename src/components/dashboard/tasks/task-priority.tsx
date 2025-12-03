import * as React from 'react';
import Typography from '@mui/joy/Typography';
import { Diamond as DiamondIcon } from '@phosphor-icons/react/dist/ssr/Diamond';

import type { Task } from './types';

const priorityMapping = {
  high: { label: 'High', color: 'var(--joy-palette-danger-400)' },
  mid: { label: 'Mid', color: 'var(--joy-palette-warning-200)' },
  low: { label: 'Low', color: 'var(--joy-palette-success-400)' },
} satisfies Record<Exclude<Task['priority'], undefined>, { label: string; color: string }>;

export interface TaskPriorityProps {
  priority: Exclude<Task['priority'], undefined>;
}

export function TaskPriority({ priority }: TaskPriorityProps): React.JSX.Element {
  const { label, color } = priorityMapping[priority] ?? { label: 'Unknown', color: 'var(--joy-palette-neutral-600)' };

  return (
    <Typography level="body-xs" startDecorator={<DiamondIcon fill={color} weight="fill" />}>
      {label}
    </Typography>
  );
}
