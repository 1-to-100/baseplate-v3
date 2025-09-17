import React from 'react';
import { Select as JoySelect, Option, SelectOption as JoySelectOption } from '@mui/joy';

export interface SelectOption {
  /** Option value */
  value: string;
  /** Option label */
  label: string;
  /** Whether option is disabled */
  disabled?: boolean;
}

export interface SelectProps {
  /** Array of options */
  options: SelectOption[];
  /** Selected value */
  value?: string | string[] | null;
  /** Default value */
  defaultValue?: string | string[] | null;
  /** Placeholder text */
  placeholder?: string;
  /** Is the select disabled? */
  disabled?: boolean;
  /** Select size */
  size?: 'sm' | 'md' | 'lg';
  /** Select variant */
  variant?: 'outlined';
  /** Select color */
  color?: 'primary' | 'neutral' | 'danger' | 'success' | 'warning';
  /** Whether multiple selection is allowed */
  multiple?: boolean;
  /** Optional change handler */
  onChange?: (event: React.SyntheticEvent | null, value: string | string[] | (string | string[])[] | null) => void;
  /** Custom render function for selected value */
  renderValue?: (option: JoySelectOption<string | string[]> | JoySelectOption<string | string[]>[] | null) => React.ReactNode;
  /** Maximum number of options to display */
  maxOptions?: number;
  /** Whether to show the select as required */
  required?: boolean;
  /** Select name attribute */
  name?: string;
  /** Select id attribute */
  id?: string;
}

/** Select component for user interaction */
export const Select = ({
  options,
  value,
  defaultValue,
  placeholder,
  disabled = false,
  size = 'md',
  variant = 'outlined',
  color = 'primary',
  multiple = false,
  onChange,
  renderValue,
  maxOptions,
  required = false,
  name,
  id,
  ...props
}: SelectProps) => {
  return (
    <JoySelect
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      disabled={disabled}
      size={size}
      variant={variant}
      color={color}
      multiple={multiple}
      onChange={onChange}
      renderValue={renderValue}
      required={required}
      name={name}
      id={id}
      sx={{
        color: 'var(--joy-palette-text-primary)',
        '& .MuiSelect-select': {
          color: 'var(--joy-palette-text-primary)',
        },
        '& .MuiSelect-placeholder': {
          color: 'var(--joy-palette-text-primary)',
        },
        '& .MuiSelect-icon': {
          color: 'var(--joy-palette-text-primary)',
        },
        // Стилі для бордера
        '--Select-borderColor': 'var(--joy-palette-text-primary)',
        '--Select-hoverBorderColor': 'var(--joy-palette-text-primary)',
        '--Select-focusedBorderColor': 'var(--joy-palette-text-primary)',
        borderColor: 'var(--joy-palette-text-primary)',
        '&:hover': {
          borderColor: 'var(--joy-palette-text-primary)',
        },
        '&.Mui-focused': {
          borderColor: 'var(--joy-palette-text-primary)',
        },
      }}
      {...props}
    >
      {options.slice(0, maxOptions).map((option) => (
        <Option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </Option>
      ))}
    </JoySelect>
  );
};
