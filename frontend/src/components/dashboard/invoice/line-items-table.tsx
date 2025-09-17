'use client';

import * as React from 'react';

import { DataTable } from '@/components/core/data-table';
import type { ColumnDef } from '@/components/core/data-table';

export interface LineItem {
  id: string;
  product: string;
  quantity: number;
  currency: string;
  unitPrice: number;
  amount: number;
}

const columns = [
  { field: 'product', name: 'Item', width: '200px' },
  { field: 'quantity', name: 'Quantity', width: '100px' },
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
] satisfies ColumnDef<LineItem>[];

export interface LineItemsTableProps {
  rows: LineItem[];
}

export function LineItemsTable({ rows }: LineItemsTableProps): React.JSX.Element {
  return <DataTable<LineItem> columns={columns} rows={rows} stripe="even" />;
}
