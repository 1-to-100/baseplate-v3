'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Avatar from '@mui/joy/Avatar';
import Chip from '@mui/joy/Chip';
import IconButton from '@mui/joy/IconButton';
import Link from '@mui/joy/Link';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Pen as PenIcon } from '@phosphor-icons/react/dist/ssr/Pen';
import dayjs from 'dayjs';

import { paths } from '@/paths';
import { useSelection } from '@/hooks/use-selection';
import { DataTable } from '@/components/core/data-table';
import type { ColumnDef } from '@/components/core/data-table';

const statusMapping = {
  draft: { label: 'Draft', color: 'neutral' },
  pending: { label: 'Pending', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
  late: { label: 'Late', color: 'danger' },
  canceled: { label: 'Canceled', color: 'danger' },
} as const;

export interface Invoice {
  id: string;
  status: 'draft' | 'pending' | 'late' | 'paid' | 'canceled';
  customer: { name: string; email: string; avatar?: string };
  currency: string;
  amount: number;
  issueDate: Date;
  dueDate: Date;
}

const columns = [
  {
    formatter: (row): React.JSX.Element => (
      <Link
        component={RouterLink}
        fontSize="sm"
        fontWeight="md"
        href={paths.dashboard.invoices.details('1')}
        underline="none"
      >
        {row.id}
      </Link>
    ),
    name: 'Invoice ID',
    width: '150px',
  },
  {
    formatter: (row): React.JSX.Element => (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar src={row.customer.avatar} />
        <div>
          <Typography level="body-sm" textColor="text.primary">
            {row.customer.name}
          </Typography>
          <Typography level="body-xs">{row.customer.email}</Typography>
        </div>
      </Stack>
    ),
    name: 'Customer',
    width: '300px',
  },
  {
    formatter: (row): string => {
      return dayjs(row.issueDate).format('MMM D, YYYY');
    },
    name: 'Issue Date',
    width: '150px',
  },
  {
    formatter: (row): string => {
      return dayjs(row.dueDate).format('MMM D, YYYY');
    },
    name: 'Due Date',
    width: '150px',
  },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency }).format(row.amount);
    },
    name: 'Amount',
    width: '150px',
  },
  {
    formatter: (row): React.JSX.Element => {
      const { color, label } = statusMapping[row.status] ?? { label: 'Unknown', color: 'neutral' };

      return (
        <Chip color={color} size="sm" variant="soft">
          {label}
        </Chip>
      );
    },
    name: 'Status',
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
] satisfies ColumnDef<Invoice>[];

export interface InvoicesTableProps {
  rows: Invoice[];
}

export function InvoicesTable({ rows = [] }: InvoicesTableProps): React.JSX.Element {
  const rowIds = React.useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useSelection(rowIds);

  return (
    <DataTable<Invoice>
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
