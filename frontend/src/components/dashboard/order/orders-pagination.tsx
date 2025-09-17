'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';

import { paths } from '@/paths';
import { Pagination } from '@/components/core/pagination';

interface OrdersPaginationProps {
  count: number;
  page: number;
  rowsPerPage: number;
}

export function OrdersPagination({ count, page, rowsPerPage }: OrdersPaginationProps): React.JSX.Element {
  const router = useRouter();

  const handleChange = (_: React.MouseEvent, newPage: number | null): void => {
    // NOTE: You might want to persist the other search params, such as filters.

    const searchParams = new URLSearchParams();

    if (newPage) {
      searchParams.set('page', newPage.toString());
    }

    router.push(`${paths.dashboard.orders.list}?${searchParams.toString()}`);
  };

  const pages = Math.ceil(count / rowsPerPage);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Pagination
        count={pages}
        disabled={pages <= 1}
        onChange={handleChange}
        page={page}
        showFirstButton
        showLastButton
        size="sm"
        variant="outlined"
      />
    </Box>
  );
}
