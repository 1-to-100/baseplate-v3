'use client';

import * as React from 'react';
import Stack from '@mui/joy/Stack';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import Box from '@mui/joy/Box';
import type { ApiUser } from '@/contexts/auth/types';

interface SelectUserProps {
  availableUsers: ApiUser[];
  selectedUsers: string[];
  onUsersChange: (users: string[]) => void;
  isLoading?: boolean;
}

export function SelectUser({
  availableUsers,
  selectedUsers,
  onUsersChange,
  isLoading,
}: SelectUserProps): React.JSX.Element {
  const handleUsersChange = React.useCallback(
    (event: React.SyntheticEvent | null, newValue: string | string[] | null) => {
      onUsersChange(newValue as string[]);
    },
    [onUsersChange]
  );

  return (
    <Stack>
      <Typography
        level='body-sm'
        sx={{
          fontSize: { xs: '12px', sm: '14px' },
          color: 'var(--joy-palette-text-primary)',
          mb: 0.5,
          fontWeight: 500,
        }}
      >
        Users
      </Typography>
      <Select
        multiple
        placeholder='Select users'
        value={selectedUsers}
        onChange={handleUsersChange}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {selected.map((item) => {
              const user = availableUsers.find((u) => u.id.toString() === item.value);
              return (
                <Chip key={item.value} size='sm'>
                  {user?.name || user?.email || item.value}
                </Chip>
              );
            })}
          </Box>
        )}
        sx={{
          borderRadius: '6px',
          fontSize: { xs: '12px', sm: '14px' },
        }}
        disabled={isLoading}
        slotProps={{
          listbox: {
            placement: 'top',
          },
        }}
      >
        {availableUsers
          .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''))
          .map((user) => (
            <Option key={user.id} value={user.id.toString()}>
              {user.name || user.email}
            </Option>
          ))}
      </Select>
    </Stack>
  );
}
