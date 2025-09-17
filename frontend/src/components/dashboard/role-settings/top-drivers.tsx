import * as React from 'react';
import Card from '@mui/joy/Card';
import Stack from '@mui/joy/Stack';
import Table from '@mui/joy/Table';
import Typography from '@mui/joy/Typography';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUp as CaretUpIcon } from '@phosphor-icons/react/dist/ssr/CaretUp';

export interface Driver {
  id: string;
  name: string;
  deliveries: number;
  trend: 'up' | 'down';
}

export interface TopDriversProps {
  data: Driver[];
}

export function TopDrivers({ data = [] }: TopDriversProps): React.JSX.Element {
  return (
    <Card sx={{ gap: 2 }}>
      <Typography level="h4">Top Drivers</Typography>
      <Table borderAxis="header" stripe="even" sx={{ '--TableCell-paddingX': '12px', '--TableCell-paddingY': '12px' }}>
        <thead>
          <tr>
            <th>Driver</th>
            <th>Deliveries</th>
          </tr>
        </thead>
        <tbody>
          {data.map(
            (driver): React.JSX.Element => (
              <tr key={driver.id}>
                <td>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    {driver.trend === 'up' ? (
                      <CaretUpIcon
                        color="var(--joy-palette-success-500)"
                        fontSize="var(--joy-fontSize-md)"
                        weight="fill"
                      />
                    ) : (
                      <CaretDownIcon
                        color="var(--joy-palette-danger-500)"
                        fontSize="var(--joy-fontSize- md)"
                        weight="fill"
                      />
                    )}
                    <Typography noWrap>{driver.name}</Typography>
                  </Stack>
                </td>
                <td>{driver.deliveries}</td>
              </tr>
            )
          )}
        </tbody>
      </Table>
    </Card>
  );
}
