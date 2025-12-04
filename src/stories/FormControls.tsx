import React from 'react';
import Box from '@mui/joy/Box';
import Radio from '@mui/joy/Radio';
import RadioGroup from '@mui/joy/RadioGroup';
import Checkbox from '@mui/joy/Checkbox';
import Typography from '@mui/joy/Typography';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Stack from '@mui/joy/Stack';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CheckboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormControlsProps {
  type: 'radio' | 'checkbox';
  label?: string;
  options: (RadioOption | CheckboxOption)[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'neutral' | 'danger' | 'success' | 'warning';
}

export function FormControls({
  type,
  label,
  options,
  value,
  onChange,
  error = false,
  helperText,
  disabled = false,
  size = 'md',
  color = 'primary',
}: FormControlsProps) {
  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event.target.value);
    }
  };

  const handleCheckboxChange = (checkedValue: string) => {
    if (onChange) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(checkedValue)
        ? currentValues.filter((v) => v !== checkedValue)
        : [...currentValues, checkedValue];
      onChange(newValues);
    }
  };

  return (
    <FormControl error={error} disabled={disabled}>
      {label && (
        <FormLabel
          sx={{
            fontSize: { xs: '12px', sm: '14px' },
            color: 'var(--joy-palette-text-primary)',
            mb: 1,
            fontWeight: 500,
          }}
        >
          {label}
        </FormLabel>
      )}

      {type === 'radio' ? (
        <RadioGroup value={value as string} onChange={handleRadioChange} size={size}>
          <Stack spacing={1}>
            {options.map((option) => (
              <Box
                key={option.value}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  opacity: option.disabled || disabled ? 0.5 : 1,
                  pointerEvents: option.disabled || disabled ? 'none' : 'auto',
                }}
                onClick={() => !option.disabled && !disabled && onChange && onChange(option.value)}
              >
                <Box
                  sx={{
                    width: size === 'sm' ? '16px' : size === 'lg' ? '24px' : '20px',
                    height: size === 'sm' ? '16px' : size === 'lg' ? '24px' : '20px',
                    border: value === option.value ? 'none' : '1px solid #dde7ee',
                    borderRadius: '50%',
                    background:
                      value === option.value
                        ? 'linear-gradient(120deg, #1E1A6F 0%, #3439B0 100%)'
                        : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {value === option.value && (
                    <Box
                      sx={{
                        width: size === 'sm' ? '6px' : size === 'lg' ? '10px' : '8px',
                        height: size === 'sm' ? '6px' : size === 'lg' ? '10px' : '8px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                      }}
                    />
                  )}
                </Box>
                <Typography
                  sx={{
                    fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
                    color: 'var(--joy-palette-text-primary)',
                  }}
                >
                  {option.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </RadioGroup>
      ) : (
        <Stack spacing={1}>
          {options.map((option) => (
            <Box
              key={option.value}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                opacity: option.disabled || disabled ? 0.5 : 1,
                pointerEvents: option.disabled || disabled ? 'none' : 'auto',
              }}
              onClick={() => !option.disabled && !disabled && handleCheckboxChange(option.value)}
            >
              <Box
                sx={{
                  width: size === 'sm' ? '16px' : size === 'lg' ? '24px' : '20px',
                  height: size === 'sm' ? '16px' : size === 'lg' ? '24px' : '20px',
                  border: '1px solid #dde7ee',
                  borderColor:
                    Array.isArray(value) && value.includes(option.value)
                      ? 'transparent'
                      : '#dde7ee',
                  borderRadius: '3px',
                  background:
                    Array.isArray(value) && value.includes(option.value)
                      ? 'linear-gradient(120deg, #282490 0%, #3F4DCF 100%)'
                      : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background:
                      Array.isArray(value) && value.includes(option.value)
                        ? 'linear-gradient(120deg, #1E1A6F 0%, #3439B0 100%)'
                        : 'transparent',
                  },
                }}
              >
                {Array.isArray(value) && value.includes(option.value) && (
                  <Box
                    component='svg'
                    viewBox='0 0 24 24'
                    sx={{
                      width: size === 'sm' ? '10px' : size === 'lg' ? '16px' : '16px',
                      height: size === 'sm' ? '10px' : size === 'lg' ? '16px' : '16px',
                      fill: 'white',
                      stroke: 'white',
                    }}
                  >
                    <path d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' />
                  </Box>
                )}
              </Box>
              <Typography
                sx={{
                  fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
                  color: 'var(--joy-palette-text-primary)',
                }}
              >
                {option.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {helperText && (
        <FormHelperText
          sx={{
            color: error ? 'var(--joy-palette-danger-500)' : 'var(--joy-palette-text-secondary)',
            fontSize: { xs: '10px', sm: '12px' },
            mt: 0.5,
          }}
        >
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
}
