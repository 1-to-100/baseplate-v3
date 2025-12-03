'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import IconButton from '@mui/joy/IconButton';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';

import type { Settings } from '@/types/settings';
import { setSettings as setPersistedSettings } from '@/lib/settings/set-settings';
import { usePopover } from '@/hooks/use-popover';
import { useSettings } from '@/hooks/use-settings';

import { SettingsPopover } from './settings-popover';

export function SettingsButton(): React.JSX.Element {
  const { settings } = useSettings();
  const popover = usePopover<HTMLButtonElement>();
  const router = useRouter();

  const handleUpdate = async (values: Partial<Settings>): Promise<void> => {
    popover.handleClose();

    const updatedSettings = { ...settings, ...values } satisfies Settings;

    await setPersistedSettings(updatedSettings);

    // Refresh the router to apply the new settings.
    router.refresh();
  };

  return (
    <React.Fragment>
      <IconButton
        color="neutral"
        onClick={popover.handleOpen}
        ref={popover.anchorRef}
        sx={{
          bottom: 0,
          boxShadow: 'var(--joy-shadow-lg)',
          m: '40px',
          position: 'fixed',
          right: 0,
          zIndex: 'var(--joy-zIndex-popup)',
          '& svg': {
            animation: 'spin 4s linear infinite',
            '@keyframes spin': { '0%': { rotate: '0' }, '100%': { rotate: '360deg' } },
          },
        }}
        variant="solid"
      >
        <GearSixIcon fontSize="var(--Icon-fontSize)" weight="bold" />
      </IconButton>
      <SettingsPopover
        anchorEl={popover.anchorRef.current}
        onClose={popover.handleClose}
        onUpdate={handleUpdate}
        open={popover.open}
        settings={settings}
      />
    </React.Fragment>
  );
}
