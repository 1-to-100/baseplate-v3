'use client';

import * as React from 'react';
import Avatar from '@mui/joy/Avatar';
import IconButton from '@mui/joy/IconButton';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { Pen as PenIcon } from '@phosphor-icons/react/dist/ssr/Pen';

import { DataTable } from '@/components/core/data-table';
import type { ColumnDef } from '@/components/core/data-table';

export interface LineItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  currency: string;
  unitPrice: number;
  amount: number;
}

const columns = [
  {
    formatter: (row): React.JSX.Element => (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Avatar
          src={row.image}
          sx={{
            '--Avatar-radius': 'var(--joy-radius-sm)',
            '--Icon-fontSize': 'var(--joy-fontSize-xl)',
            height: '42px',
            width: '42px',
          }}
        >
          <PackageIcon fontSize="var(--Icon-fontSize)" weight="bold" />
        </Avatar>
        <Typography>{row.name}</Typography>
      </Stack>
    ),
    name: 'Items',
    width: '250px',
  },
  { field: 'quantity', name: 'Qty', width: '100px' },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency }).format(row.unitPrice);
    },
    name: 'Unit Price',
    width: '100px',
  },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency }).format(row.amount);
    },
    name: 'Amount',
    width: '100px',
  },
  {
    formatter: (): React.JSX.Element => (
      <IconButton color="neutral" size="sm" variant="plain">
        <PenIcon fontSize="var(--Icon-fontSize)" weight="bold" />
      </IconButton>
    ),
    name: 'Actions',
    hideName: true,
    width: '80px',
    align: 'right',
  },
] satisfies ColumnDef<LineItem>[];

export interface LineItemsTableProps {
  rows: LineItem[];
}

export function LineItemsTable({ rows }: LineItemsTableProps): React.JSX.Element {
  return <DataTable<LineItem> columns={columns} rows={rows} stripe="even" />;
}
