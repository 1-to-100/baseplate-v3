'use client';

import * as React from 'react';
import Checkbox from '@mui/joy/Checkbox';
import Table from '@mui/joy/Table';
import type { TableProps } from '@mui/joy/Table';

export interface ColumnDef<TRowModel> {
  align?: 'left' | 'right' | 'center';
  field?: keyof TRowModel;
  formatter?: (row: TRowModel, index: number) => React.ReactNode;
  hideName?: boolean;
  name: string;
  width?: number | string;
}

type RowId = number | string;

export interface DataTableProps<TRowModel> extends TableProps {
  columns: ColumnDef<TRowModel>[];
  hoverRow?: boolean;
  onDeselectAll?: (event: React.ChangeEvent) => void;
  onDeselectOne?: (event: React.ChangeEvent, row: TRowModel) => void;
  onSelectAll?: (event: React.ChangeEvent) => void;
  onSelectOne?: (event: React.ChangeEvent, row: TRowModel) => void;
  rows: TRowModel[];
  selectable?: boolean;
  selected?: Set<RowId>;
  uniqueRowId?: (row: TRowModel) => RowId;
}

export function DataTable<TRowModel extends object & { id?: RowId | null }>({
  columns,
  hoverRow,
  onDeselectAll,
  onDeselectOne,
  onSelectOne,
  onSelectAll,
  rows,
  selectable,
  selected,
  uniqueRowId,
  ...props
}: DataTableProps<TRowModel>): React.JSX.Element {
  const selectedSome = (selected?.size ?? 0) > 0 && (selected?.size ?? 0) < rows.length;
  const selectedAll = rows.length > 0 && selected?.size === rows.length;

  return (
    <Table borderAxis="header" hoverRow={hoverRow} {...props}>
      <thead>
        <tr>
          {selectable ? (
            <th style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>
              <Checkbox
                checked={selectedAll}
                indeterminate={selectedSome}
                onChange={(event: React.ChangeEvent) => {
                  if (selectedAll) {
                    onDeselectAll?.(event);
                  } else {
                    onSelectAll?.(event);
                  }
                }}
                sx={{ verticalAlign: 'sub' }}
              />
            </th>
          ) : null}
          {columns.map(
            (column): React.JSX.Element => (
              <th
                key={column.name}
                style={{
                  width: column.width,
                  minWidth: column.width,
                  maxWidth: column.width,
                  ...(column.align && { textAlign: column.align }),
                }}
              >
                {column.hideName ? null : column.name}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index): React.JSX.Element => {
          const rowId = row.id ? row.id : uniqueRowId?.(row);
          const rowSelected = rowId ? selected?.has(rowId) ?? false : false;

          return (
            <tr key={rowId ?? index}>
              {selectable ? (
                <td>
                  <Checkbox
                    checked={rowId ? rowSelected : false}
                    onChange={(event: React.ChangeEvent) => {
                      if (rowSelected) {
                        onDeselectOne?.(event, row);
                      } else {
                        onSelectOne?.(event, row);
                      }
                    }}
                  />
                </td>
              ) : null}
              {columns.map(
                (column): React.JSX.Element => (
                  <td key={column.name} style={{ ...(column.align && { textAlign: column.align }) }}>
                    {
                      (column.formatter
                        ? column.formatter(row, index)
                        : column.field
                          ? row[column.field]
                          : null) as React.ReactNode
                    }
                  </td>
                )
              )}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
