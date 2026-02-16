'use client';

import * as React from 'react';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { TextAlignLeft as TextAlignLeftIcon } from '@phosphor-icons/react/dist/ssr/TextAlignLeft';
import { TextAlignRight as TextAlignRightIcon } from '@phosphor-icons/react/dist/ssr/TextAlignRight';

import type { Settings } from '@/types/settings';
import { Popup, PopupContent } from '@/components/core/popup';
import type { Direction } from '@/styles/theme/types';

export interface SettingsPopoverProps {
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  onUpdate?: (value: Partial<Settings>) => void;
  open: boolean;
  settings: Settings;
}

export function SettingsPopover({
  anchorEl,
  onClose,
  onUpdate,
  open,
  settings,
}: SettingsPopoverProps): React.JSX.Element | null {
  const [direction, setDirection] = React.useState<Direction>(settings.direction ?? 'ltr');

  React.useEffect((): void => {
    setDirection(settings.direction ?? 'ltr');
  }, [settings]);

  return (
    <Popup
      anchorEl={anchorEl}
      onClose={onClose}
      open={open}
      placement='top-end'
      sx={{ maxWidth: '320px', pb: 1 }}
    >
      <PopupContent sx={{ p: 2 }}>
        <Stack spacing={3}>
          <Stack spacing={2}>
            <Typography level='title-md'>Direction</Typography>
            <Stack direction='row' spacing={2} sx={{ flexWrap: 'wrap' }}>
              {(
                [
                  { label: 'Left to Right', value: 'ltr' },
                  { label: 'Right to Left', value: 'rtl' },
                ] satisfies { label: string; value: Direction }[]
              ).map((option) => (
                <Chip
                  color={direction === option.value ? 'primary' : 'neutral'}
                  key={option.value}
                  onClick={(): void => {
                    setDirection(option.value);
                  }}
                  startDecorator={
                    option.value === 'ltr' ? (
                      <TextAlignLeftIcon fontSize='var(--joy-fontSize-lg)' />
                    ) : (
                      <TextAlignRightIcon fontSize='var(--joy-fontSize-lg)' />
                    )
                  }
                >
                  {option.label}
                </Chip>
              ))}
            </Stack>
          </Stack>
          <Button
            color='neutral'
            onClick={(): void => {
              onUpdate?.({ direction });
            }}
            size='sm'
            variant='outlined'
          >
            Apply
          </Button>
        </Stack>
      </PopupContent>
    </Popup>
  );
}
