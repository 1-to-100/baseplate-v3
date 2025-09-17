'use client';

import * as React from 'react';
import Chip from '@mui/joy/Chip';
import IconButton from '@mui/joy/IconButton';
import Link from '@mui/joy/Link';
import { Printer as PrinterIcon } from '@phosphor-icons/react/dist/ssr/Printer';
import dayjs from 'dayjs';

import { DataTable } from '@/components/core/data-table';
import type { ColumnDef } from '@/components/core/data-table';

const statusMapping = {
  pending: { label: 'Pending', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
  canceled: { label: 'Canceled', color: 'danger' },
} as const;

export interface Invoice {
  id: string;
  description: string;
  currency: string;
  amount: number;
  status: 'pending' | 'paid' | 'canceled';
  issueDate: Date;
}

const columns = [
  {
    formatter: (row): React.JSX.Element => (
      <Link fontSize="sm" fontWeight="md" underline="none">
        {row.id}
      </Link>
    ),
    name: 'Invoice ID',
    width: '150px',
  },
  { field: 'description', name: 'Description', width: '150px' },
  {
    formatter: (row): string => {
      return dayjs(row.issueDate).format('MMM D, YYYY');
    },
    name: 'Billing Date',
    width: '150px',
  },
  {
    formatter: (row): string => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency }).format(row.amount);
    },
    name: 'Amount',
    width: '100px',
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
    width: '100px',
  },
  {
    formatter: (): React.JSX.Element => (
      <IconButton color="neutral" size="sm" variant="plain">
        <PrinterIcon fontSize="var(--Icon-fontSize)" weight="bold" />
      </IconButton>
    ),
    name: 'Actions',
    hideName: true,
    width: '100px',
    align: 'right',
  },
] satisfies ColumnDef<Invoice>[];

export interface InvoicesTableProps {
  rows: Invoice[];
}

export function InvoicesTable({ rows }: InvoicesTableProps): React.JSX.Element {
  return (
    <DataTable<Invoice>
      columns={columns}
      rows={rows}
      stripe="even"
      sx={{ '--TableCell-paddingX': '20px', '--TableCell-paddingY': '12px' }}
    />
  );
}
