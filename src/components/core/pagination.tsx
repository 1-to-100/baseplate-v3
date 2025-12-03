'use client';

import * as React from 'react';
import Stack from '@mui/joy/Stack';

import { usePagination } from '@/hooks/use-pagination';
import type { PaginationItemType } from '@/hooks/use-pagination';
import { PaginationItem } from '@/components/core/pagination-item';

function noop(): void {
  return undefined;
}

export interface PaginationProps {
  boundaryCount?: number;
  color?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  count: number;
  defaultPage?: number;
  disabled?: boolean;
  hideNextButton?: boolean;
  hidePrevButton?: boolean;
  onChange?: (event: React.MouseEvent, value: number | null) => void;
  page?: number;
  showFirstButton?: boolean;
  showLastButton?: boolean;
  siblingCount?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'outlined' | 'soft' | 'solid';
}

// This is an adaptation of the MUI Pagination component.
// https://mui.com/material-ui/react-pagination/
export function Pagination({
  boundaryCount = 1,
  color = 'neutral',
  count = 1,
  defaultPage = 1,
  disabled = false,
  hideNextButton = false,
  hidePrevButton = false,
  onChange = noop,
  page,
  showFirstButton = false,
  showLastButton = false,
  siblingCount = 1,
  size = 'md',
  variant = 'outlined',
}: PaginationProps): React.JSX.Element {
  const { items } = usePagination({
    boundaryCount,
    count,
    defaultPage,
    disabled,
    hideNextButton,
    hidePrevButton,
    onChange,
    page,
    showFirstButton,
    showLastButton,
    siblingCount,
  });

  return (
    <Stack
      aria-label="pagination navigation"
      component="ul"
      direction="row"
      spacing={2}
      sx={{ alignItems: 'center', flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0 }}
    >
      {items.map((item): React.JSX.Element => {
        const key = item.type === 'page' ? `page-${item.page}` : item.type;

        return (
          <li key={key}>
            <PaginationItem
              aria-label={defaultGetAriaLabel(item.type, item.page, item.selected)}
              color={color}
              size={size}
              variant={variant}
              {...item}
            />
          </li>
        );
      })}
    </Stack>
  );
}

function defaultGetAriaLabel(type: PaginationItemType, page: number | null, selected?: boolean): string {
  if (type === 'page') {
    return `${selected ? '' : 'Go to '}page ${page}`;
  }

  return `Go to ${type} page`;
}
