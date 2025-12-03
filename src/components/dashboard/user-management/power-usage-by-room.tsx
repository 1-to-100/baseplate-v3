'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Cell, Label, Pie, PieChart, Tooltip } from 'recharts';

import { NoSsr } from '@/components/core/no-ssr';

export interface PowerUsageByRoomProps {
  data: { id: string; name: string; value: number; color: string }[];
}

export function PowerUsageByRoom({ data = [] }: PowerUsageByRoomProps): React.JSX.Element {
  const chartSize = 200;
  const chartThickness = 30;

  return (
    <Card>
      <Typography level="h4">Consumption By Room</Typography>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'center', flex: '1 1 auto' }}>
        <NoSsr fallback={<Box sx={{ height: chartSize, width: chartSize }} />}>
          <PieChart height={chartSize} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} width={chartSize}>
            <Pie
              animationDuration={300}
              cx={chartSize / 2}
              cy={chartSize / 2}
              data={data}
              dataKey="value"
              innerRadius={chartSize / 2 - chartThickness}
              nameKey="name"
              outerRadius={chartSize / 2}
              strokeWidth={0}
            >
              {data.map(
                (room): React.JSX.Element => (
                  <Cell fill={room.color} key={room.id} />
                )
              )}
              <Label content={<LabelContent value="657kWh" />} position="center" />
            </Pie>
            <Tooltip animationDuration={50} content={<TooltipContent />} />
          </PieChart>
        </NoSsr>
        <Legend payload={data} />
      </Stack>
    </Card>
  );
}

interface LabelContentProps {
  viewBox?: { cx: number; cy: number };
  value: number | string;
}

function LabelContent({ viewBox, value }: LabelContentProps): React.JSX.Element {
  const { cx, cy } = viewBox ?? { cx: 0, cy: 0 };

  return (
    <text dominantBaseline="middle" textAnchor="middle" x={cx} y={cy}>
      <tspan
        fill="var(--joy-palette-text-primary)"
        fontSize="var(--joy-fontSize-lg)"
        fontWeight="var(--joy-fontWeight-lg)"
      >
        {value}
      </tspan>
    </text>
  );
}

interface LegendProps {
  payload?: { name: string; value: number; color: string }[];
}

function Legend({ payload }: LegendProps): React.JSX.Element {
  return (
    <Stack spacing={1}>
      {payload?.map(
        (entry): React.JSX.Element => (
          <Stack direction="row" key={entry.name} spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ bgcolor: entry.color, borderRadius: 'var(--joy-radius-xs)', height: '8px', width: '8px' }} />
            <Typography textColor="text.secondary">{entry.name}</Typography>
          </Stack>
        )
      )}
    </Stack>
  );
}

interface TooltipContentProps {
  active?: boolean;
  payload?: { name: string; payload: { fill: string }; value: number }[];
}

function TooltipContent({ active, payload }: TooltipContentProps): React.JSX.Element | null {
  if (!active) {
    return null;
  }

  return (
    <Sheet
      sx={{
        boxShadow: 'var(--joy-shadow-lg)',
        borderRadius: 'var(--joy-radius-sm)',
        border: '1px solid var(--joy-palette-neutral-outlinedBorder)',
        p: 1,
      }}
    >
      {payload?.map(
        (entry): React.JSX.Element => (
          <Stack
            direction="row"
            key={entry.name}
            spacing={3}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box sx={{ bgcolor: entry.payload.fill, borderRadius: '2px', height: '8px', width: '8px' }} />
              <Typography fontSize="sm" fontWeight="md" whiteSpace="nowrap">
                {entry.name}
              </Typography>
            </Stack>
            <Typography fontSize="sm" textColor="text.tertiary">
              {entry.value}kWh
            </Typography>
          </Stack>
        )
      )}
    </Sheet>
  );
}
