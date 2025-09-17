'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';

import { Pagination } from '@/components/core/pagination';

interface ProductsPaginationProps {
  count: number;
  page: number;
  rowsPerPage: number;
}

// See orders pagination implementation
export function ProductsPagination({ count, page, rowsPerPage }: ProductsPaginationProps): React.JSX.Element {
  const pagesCount = Math.ceil(count / rowsPerPage);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Pagination count={pagesCount} page={page} showFirstButton showLastButton size="sm" variant="outlined" />
    </Box>
  );
}
