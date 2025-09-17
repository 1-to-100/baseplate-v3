'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';

import { Pagination } from '@/components/core/pagination';

interface CustomersPaginationProps {
  count: number;
  page: number;
  rowsPerPage: number;
}

// See orders pagination implementation
export function CustomersPagination({ count, page, rowsPerPage }: CustomersPaginationProps): React.JSX.Element {
  const pagesCount = Math.ceil(count / rowsPerPage);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Pagination count={pagesCount} page={page} showFirstButton showLastButton size="sm" variant="outlined" />
    </Box>
  );
}
