'use client';

import * as React from 'react';
import Stack from '@mui/joy/Stack';
import Input from '@mui/joy/Input';
import Typography from '@mui/joy/Typography';
import FormHelperText from '@mui/joy/FormHelperText';

interface FirstNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function FirstNameField({
  value,
  onChange,
  error,
  disabled,
}: FirstNameFieldProps): React.JSX.Element {
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
        First Name
      </Typography>
      <Input
        placeholder='Enter first name'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
        disabled={disabled}
        slotProps={{ input: { maxLength: 255 } }}
        sx={{
          borderRadius: '6px',
          fontSize: { xs: '12px', sm: '14px' },
        }}
      />
      {error && (
        <FormHelperText
          sx={{
            color: 'var(--joy-palette-danger-500)',
            fontSize: { xs: '10px', sm: '12px' },
          }}
        >
          {error}
        </FormHelperText>
      )}
    </Stack>
  );
}
