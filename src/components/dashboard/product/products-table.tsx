'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Avatar from '@mui/joy/Avatar';
import Chip from '@mui/joy/Chip';
import Link from '@mui/joy/Link';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';

import { paths } from '@/paths';
import { useSelection } from '@/hooks/use-selection';
import { DataTable } from '@/components/core/data-table';
import type { ColumnDef } from '@/components/core/data-table';

const statusMapping = {
  draft: { label: 'Draft', color: 'neutral' },
  published: { label: 'Published', color: 'success' },
} as const;

export interface Product {
  id: string;
  name: string;
  image?: string;
  category: string;
  quantity: number;
  currency: 'USD';
  price: number;
  status: 'draft' | 'published';
}

const columns = [
  {
    formatter: (row): React.JSX.Element => (
      <Link
        component={RouterLink}
        fontSize="sm"
        fontWeight="md"
        href={paths.dashboard.products.details('1')}
        underline="none"
      >
        {row.id}
      </Link>
    ),
    name: 'Product ID',
    width: '150px',
  },
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
    width: '400px',
  },
  {
    formatter: (row): React.JSX.Element => (
      <Chip size="sm" variant="soft">
        {row.category}
      </Chip>
    ),
    name: 'Category',
    width: '200px',
  },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US').format(row.quantity);
    },
    name: 'Stock',
    width: '200px',
  },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency }).format(row.price);
    },
    name: 'Price',
    width: '200px',
  },
  {
    formatter: (row): React.JSX.Element => {
      const { label, color } = statusMapping[row.status] ?? { label: 'Unknown', color: 'neutral' };

      return (
        <Chip color={color} size="sm" variant="soft">
          {label}
        </Chip>
      );
    },
    name: 'Status',
    width: '200px',
  },
] satisfies ColumnDef<Product>[];

export interface ProductsTableProps {
  rows: Product[];
}

export function ProductsTable({ rows = [] }: ProductsTableProps): React.JSX.Element {
  const rowIds = React.useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useSelection(rowIds);

  return (
    <DataTable<Product>
      columns={columns}
      onDeselectAll={selection.deselectAll}
      onDeselectOne={(_, row) => {
        selection.deselectOne(row.id);
      }}
      onSelectAll={selection.selectAll}
      onSelectOne={(_, row) => {
        selection.selectOne(row.id);
      }}
      rows={rows}
      selectable
      selected={selection.selected}
      stripe="even"
    />
  );
}
