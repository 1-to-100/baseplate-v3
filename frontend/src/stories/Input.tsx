import React from 'react';
import { Input as JoyInput, InputProps as JoyInputProps } from '@mui/joy';

export interface InputProps extends Omit<JoyInputProps, 'variant' | 'color'> {
  /** Input placeholder text */
  placeholder?: string;
  /** Input value */
  value?: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  /** Is the input disabled? */
  disabled?: boolean;
  /** Is the input in error state? */
  error?: boolean;
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Input variant */
  variant?: 'outlined';
  /** Input color */
  color?: 'primary' | 'neutral' | 'danger' | 'success' | 'warning';
  /** Start decorator (icon or text before input) */
  startDecorator?: React.ReactNode;
  /** End decorator (icon or text after input) */
  endDecorator?: React.ReactNode;
  /** Optional change handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Optional focus handler */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Optional blur handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Whether input is required */
  required?: boolean;
  /** Input name attribute */
  name?: string;
  /** Input id attribute */
  id?: string;
}

/** Input component for user interaction */
export const Input = ({
  placeholder,
  type = 'text',
  disabled = false,
  error = false,
  size = 'md',
  variant = 'outlined',
  color = 'primary',
  onChange,
  onFocus,
  onBlur,
  required = false,
  name,
  id,
  ...props
}: InputProps) => {
  return (
    <JoyInput
      placeholder={placeholder}
      type={type}
      disabled={disabled}
      error={error}
      size={size}
      variant={variant}
      color={color}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      required={required}
      name={name}
      id={id}
      sx={{
        color: 'var(--joy-palette-text-primary)',
        '& .MuiInput-input': {
          color: 'var(--joy-palette-text-primary)',
        },
        '& .MuiInput-placeholder': {
          color: 'var(--joy-palette-text-primary)',
        },
        '& .MuiInput-startDecorator': {
          color: 'var(--joy-palette-text-primary)',
        },
        '& .MuiInput-endDecorator': {
          color: 'var(--joy-palette-text-primary)',
        },
        // Стилі для бордера
        '--Input-borderColor': 'var(--joy-palette-text-primary)',
        '--Input-hoverBorderColor': 'var(--joy-palette-text-primary)',
        '--Input-focusedBorderColor': 'var(--joy-palette-text-primary)',
        borderColor: 'var(--joy-palette-text-primary)',
        '&:hover': {
          borderColor: 'var(--joy-palette-text-primary)',
        },
        '&.Mui-focused': {
          borderColor: 'var(--joy-palette-text-primary)',
        },
      }}
      {...props}
    />
  );
};
