'use client';

import * as React from 'react';
import Stack from '@mui/joy/Stack';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Typography from '@mui/joy/Typography';

interface TeamOption {
  team_id: string;
  team_name: string;
}

interface TeamFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: TeamOption[];
  error?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function TeamField({
  value,
  onChange,
  options,
  error,
  disabled,
  isLoading,
}: TeamFieldProps): React.JSX.Element {
  return (
    <Stack sx={{ flex: 1 }}>
      <Typography
        level='body-sm'
        sx={{
          fontSize: { xs: '12px', sm: '14px' },
          color: 'var(--joy-palette-text-primary)',
          mb: 0.5,
          fontWeight: 500,
        }}
      >
        Team
      </Typography>
      <Select
        placeholder='Select team'
        value={value}
        onChange={(e, newValue) => {
          const teamValue = newValue === null ? '' : String(newValue);
          onChange(teamValue);
        }}
        disabled={disabled || isLoading}
        slotProps={{
          listbox: {
            placement: 'top',
          },
        }}
        sx={{
          borderRadius: '6px',
          fontSize: { xs: '12px', sm: '14px' },
        }}
      >
        <Option value=''>None</Option>
        {options.map((team) => (
          <Option key={team.team_id} value={String(team.team_id)}>
            {team.team_name}
          </Option>
        ))}
      </Select>
    </Stack>
  );
}
