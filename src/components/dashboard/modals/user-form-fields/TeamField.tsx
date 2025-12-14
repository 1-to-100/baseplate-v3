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
    <Stack sx={{ flex: 1, minWidth: 0 }}>
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
        renderValue={(selected) => {
          if (!selected) {
            return null;
          }
          // Handle both single select (object) and multiple select (array) cases
          const selectedValue = Array.isArray(selected)
            ? selected[0]?.value
            : selected?.value || selected;
          const team = options.find((team) => String(team.team_id) === String(selectedValue));
          const teamName = team?.team_name || '';

          if (!teamName) {
            return null;
          }

          return (
            <Typography
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                maxWidth: '100%',
                fontSize: { xs: '12px', sm: '14px' },
              }}
            >
              {teamName}
            </Typography>
          );
        }}
        slotProps={{
          listbox: {
            placement: 'top',
          },
          button: {
            sx: {
              minWidth: 0,
              maxWidth: '100%',
              overflow: 'hidden',
            },
          },
        }}
        sx={{
          borderRadius: '6px',
          fontSize: { xs: '12px', sm: '14px' },
          minWidth: 0,
          maxWidth: '100%',
          width: '100%',
          '& > div': {
            minWidth: 0,
            maxWidth: '100%',
          },
          '& .MuiSelect-button': {
            minWidth: 0,
            maxWidth: '100%',
            width: '100%',
            overflow: 'hidden',
          },
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
