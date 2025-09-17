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

export interface Variant {
  id: string;
  name: string;
  image?: string;
  quantity: number;
  currency: string;
  price: number;
  sku: string;
}

const columns = [
  { field: 'id', name: 'ID', width: '150px' },
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
    name: 'Name',
    width: '250px',
  },
  {
    formatter: (row): string => {
      return row.quantity === 0 ? 'N/A' : new Intl.NumberFormat('en-US').format(row.quantity);
    },
    name: 'Inventory',
    width: '120px',
  },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.price);
    },
    name: 'Price',
    width: '120px',
  },
  { field: 'sku', name: 'SKU', width: '150px' },
  {
    formatter: (): React.JSX.Element => (
      <IconButton size="sm">
        <PenIcon fontSize="var(--Icon-fontSize)" weight="bold" />
      </IconButton>
    ),
    name: 'Actions',
    hideName: true,
    width: '80px',
    align: 'right',
  },
] satisfies ColumnDef<Variant>[];

export interface VariantsTableProps {
  rows: Variant[];
}

export function VariantsTable({ rows }: VariantsTableProps): React.JSX.Element {
  return <DataTable<Variant> columns={columns} rows={rows} stripe="even" />;
}
