'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import CardOverflow from '@mui/joy/CardOverflow';
import Typography from '@mui/joy/Typography';

import { DataTable } from '@/components/core/data-table';
import type { ColumnDef } from '@/components/core/data-table';

export interface RowModel {
  title: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

const columns = [
  {
    formatter: (_, index): React.JSX.Element => {
      return (
        <Box
          sx={{
            alignItems: 'center',
            bgcolor: 'var(--joy-palette-background-level1)',
            borderRadius: 'var(--joy-radius-sm)',
            display: 'flex',
            height: '32px',
            justifyContent: 'center',
            width: '32px',
          }}
        >
          {index + 1}
        </Box>
      );
    },
    name: '#',
    width: '60px',
  },
  { field: 'title', name: 'Title', width: '200px' },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US').format(row.clicks);
    },
    name: 'Clicks',
    width: '120px',
  },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US').format(row.impressions);
    },
    name: 'Impressions',
    width: '120px',
  },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(row.ctr / 100);
    },
    name: 'CTR',
    width: '100px',
  },
] satisfies ColumnDef<RowModel>[];

export interface MostVisitedPagesProps {
  data: RowModel[];
}

export function MostVisitedPages({ data = [] }: MostVisitedPagesProps): React.JSX.Element {
  return (
    <Card>
      <Typography level="h4">Most Visited Pages</Typography>
      <CardOverflow sx={{ mb: 'var(--CardOverflow-offset)', mx: 'var(--CardOverflow-offset)', overflowX: 'auto' }}>
        <DataTable<RowModel>
          columns={columns}
          rows={data}
          stripe="even"
          sx={{ '--TableCell-paddingX': '8px', '--TableCell-paddingY': '12px' }}
          uniqueRowId={(row): string => row.title}
        />
      </CardOverflow>
    </Card>
  );
}
