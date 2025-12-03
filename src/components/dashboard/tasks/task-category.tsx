import * as React from 'react';
import Chip from '@mui/joy/Chip';
import type { ChipProps } from '@mui/joy/Chip';

import type { Task } from './types';

const categoryMapping = { Branding: 'danger', Testing: 'primary', 'Design System': 'success' } as Record<
  Exclude<Task['category'], undefined>,
  ChipProps['color']
>;

export interface TaskCategoryProps {
  category: Exclude<Task['category'], undefined>;
}

export function TaskCategory({ category }: TaskCategoryProps): React.JSX.Element {
  const color = categoryMapping[category] ?? 'neutral';

  return (
    <Chip color={color} size="sm" variant="soft">
      {category}
    </Chip>
  );
}
