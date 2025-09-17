'use client';

import * as React from 'react';
import Avatar from '@mui/joy/Avatar';
import IconButton from '@mui/joy/IconButton';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Cube as CubeIcon } from '@phosphor-icons/react/dist/ssr/Cube';
import { Pen as PenIcon } from '@phosphor-icons/react/dist/ssr/Pen';
import dayjs from 'dayjs';

import { DataTable } from '@/components/core/data-table';
import type { ColumnDef } from '@/components/core/data-table';

export interface Subscription {
  id: string;
  billingCycle: string;
  productName: string;
  currency: string;
  amount: number;
  stripeId: string;
  createdAt: Date;
  updatedAt: Date;
}

const columns = [
  {
    formatter: (row): React.JSX.Element => {
      return (
        <Stack direction="row" spacing={1}>
          <Avatar
            color="primary"
            sx={{ '--Avatar-radius': 'var(--joy-radius-sm)', '--Icon-fontSize': 'var(--joy-fontSize-xl)' }}
            variant="solid"
          >
            <CubeIcon fontSize="var(--Icon-fontSize)" weight="duotone" />
          </Avatar>
          <div>
            <Typography whiteSpace="nowrap">{row.productName}</Typography>
            <Typography level="body-sm">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency }).format(row.amount)}/
              {row.billingCycle}
            </Typography>
          </div>
        </Stack>
      );
    },
    name: 'Name',
    width: '200px',
  },
  {
    formatter: (row): React.JSX.Element => {
      return (
        <Typography level="inherit" noWrap>
          {row.stripeId}
        </Typography>
      );
    },
    name: 'Stripe ID',
    width: '150px',
  },
  {
    formatter: (row): string => {
      return dayjs(row.createdAt).format('MMM D, YYYY');
    },
    name: 'Created',
    width: '150px',
  },
  {
    formatter: (row): string => {
      return dayjs(row.updatedAt).format('MMM D, YYYY');
    },
    name: 'Updated',
    width: '150px',
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
] satisfies ColumnDef<Subscription>[];

export interface SubscriptionsTableProps {
  rows: Subscription[];
}

export function SubscriptionsTable({ rows }: SubscriptionsTableProps): React.JSX.Element {
  return <DataTable<Subscription> columns={columns} rows={rows} stripe="even" />;
}
