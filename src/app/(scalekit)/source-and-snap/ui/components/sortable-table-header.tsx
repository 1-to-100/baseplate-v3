'use client';

import * as React from 'react';
import IconButton from '@mui/joy/IconButton';
import Tooltip from '@mui/joy/Tooltip';
import { CaretUp as CaretUpIcon } from '@phosphor-icons/react/dist/ssr/CaretUp';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUpDown as CaretUpDownIcon } from '@phosphor-icons/react/dist/ssr/CaretUpDown';

interface SortableTableHeaderProps {
  column: string;
  label: string;
  currentSort?: string;
  currentDirection?: 'asc' | 'desc';
  onSort: (column: string, direction: 'asc' | 'desc') => void;
}

export function SortableTableHeader({
  column,
  label,
  currentSort,
  currentDirection,
  onSort,
}: SortableTableHeaderProps): React.JSX.Element {
  const isActive = currentSort === column;
  const isAsc = isActive && currentDirection === 'asc';

  const handleClick = () => {
    if (isActive) {
      // Toggle direction if already sorted by this column
      onSort(column, currentDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new column
      onSort(column, 'desc');
    }
  };

  return (
    <th>
      <Tooltip title={`Sort by ${label}`}>
        <IconButton
          variant='plain'
          size='sm'
          onClick={handleClick}
          sx={{
            '--IconButton-size': '24px',
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'primary.500' : 'neutral.500',
            '&:hover': {
              color: 'primary.500',
            },
          }}
        >
          {isActive ? (
            isAsc ? (
              <CaretUpIcon size={16} />
            ) : (
              <CaretDownIcon size={16} />
            )
          ) : (
            <CaretUpDownIcon size={16} style={{ opacity: 0.4 }} />
          )}
          <span style={{ marginLeft: 4 }}>{label}</span>
        </IconButton>
      </Tooltip>
    </th>
  );
}
