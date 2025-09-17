import * as React from 'react';
import Avatar from '@mui/joy/Avatar';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';

export interface VehiclesStatusProps {
  onRoute: number;
  onHold: number;
  needRepair: number;
}

export function VehiclesStatus({ onRoute, onHold, needRepair }: VehiclesStatusProps): React.JSX.Element {
  return (
    <Card>
      <Typography level="h4">Vehicles Status</Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(3, 1fr)', flex: '1 1 auto' }}>
        {(
          [
            { id: 1, title: 'On Route', value: onRoute, icon: ArrowRightIcon, color: 'primary' },
            { id: 2, title: 'On Hold', value: onHold, icon: TimerIcon, color: 'warning' },
            { id: 3, title: 'Need Repair', value: needRepair, icon: WrenchIcon, color: 'danger' },
          ] satisfies {
            id: number;
            title: string;
            value: number;
            icon: Icon;
            color: 'primary' | 'warning' | 'danger';
          }[]
        ).map((entry): React.JSX.Element => {
          const Icon = entry.icon;

          return (
            <Card
              color="neutral"
              key={entry.id}
              sx={{
                alignItems: 'center',
                bgcolor: 'var(--joy-palette-background-level1)',
                flex: '1 1 auto',
                gap: 2,
                justifyContent: 'center',
                p: 1,
              }}
              variant="soft"
            >
              <Typography level="body-sm" textAlign="center">
                {entry.title}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Avatar
                  color={entry.color}
                  sx={{
                    '--Avatar-radius': 'var(--joy-radius-sm)',
                    '--Avatar-size': '24px',
                    '--Icon-fontSize': 'var(--joy-fontSize-md)',
                  }}
                  variant="soft"
                >
                  <Icon fontSize="var(--Icon-fontSize)" weight="bold" />
                </Avatar>
                <Typography level="title-md">{entry.value}</Typography>
              </Stack>
            </Card>
          );
        })}
      </Box>
    </Card>
  );
}
