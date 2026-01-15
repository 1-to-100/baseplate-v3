'use client';

import * as React from 'react';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import Tooltip from '@mui/joy/Tooltip';
import type { DeviceProfileOption } from '../../lib/types';
import { useDeviceProfileOptions } from '../../lib/hooks';

interface DeviceProfileSelectorProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  error?: boolean;
  helperText?: string;
  showPresets?: boolean;
}

const PRESET_PROFILES = [
  { programmaticName: 'desktop_1440_900', label: 'Desktop 1440x900' },
  { programmaticName: 'mobile_iphone_13_pro', label: 'iPhone 13 Pro' },
  { programmaticName: 'tablet_ipad', label: 'iPad' },
];

export function DeviceProfileSelector({
  value,
  onChange,
  error,
  helperText,
  showPresets = true,
}: DeviceProfileSelectorProps): React.JSX.Element {
  const { data: profiles = [], isLoading } = useDeviceProfileOptions({
    is_active: true,
    sort_by: 'sort_order',
    order: 'asc',
  });

  const handlePresetClick = (programmaticName: string) => {
    const profile = profiles.find((p) => p.programmatic_name === programmaticName);
    if (profile) {
      onChange(profile.options_device_profile_id);
    }
  };

  return (
    <FormControl error={error}>
      <FormLabel>Device Profile</FormLabel>
      <Select
        value={value || null}
        onChange={(_, newValue) => onChange(newValue)}
        placeholder='Select device profile or use default'
        disabled={isLoading}
        slotProps={{
          listbox: {
            sx: { maxHeight: 300 },
          },
        }}
      >
        <Option value={null}>Use Workspace Default</Option>
        {profiles.map((profile) => (
          <Option key={profile.options_device_profile_id} value={profile.options_device_profile_id}>
            <Stack spacing={0.5}>
              <span>{profile.display_name}</span>
              {profile.description && (
                <FormHelperText sx={{ fontSize: '0.75rem', m: 0 }}>
                  {profile.description}
                </FormHelperText>
              )}
            </Stack>
          </Option>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
      {showPresets && profiles.length > 0 && (
        <Stack direction='row' spacing={1} sx={{ mt: 1 }}>
          <FormHelperText sx={{ m: 0, alignSelf: 'center' }}>Quick presets:</FormHelperText>
          {PRESET_PROFILES.map((preset) => {
            const profile = profiles.find((p) => p.programmatic_name === preset.programmaticName);
            if (!profile) return null;

            const isSelected = value === profile.options_device_profile_id;

            return (
              <Tooltip
                key={preset.programmaticName}
                title={`${profile.viewport_width}x${profile.viewport_height}, DPR: ${profile.device_pixel_ratio}`}
              >
                <Chip
                  variant={isSelected ? 'solid' : 'outlined'}
                  color={isSelected ? 'primary' : 'neutral'}
                  onClick={() => handlePresetClick(preset.programmaticName)}
                  sx={{ cursor: 'pointer' }}
                  role='button'
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePresetClick(preset.programmaticName);
                    }
                  }}
                >
                  {preset.label}
                </Chip>
              </Tooltip>
            );
          })}
        </Stack>
      )}
    </FormControl>
  );
}
