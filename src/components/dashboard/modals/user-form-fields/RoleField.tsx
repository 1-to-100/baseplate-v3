"use client";

import * as React from "react";
import Stack from "@mui/joy/Stack";
import Autocomplete from "@mui/joy/Autocomplete";
import Typography from "@mui/joy/Typography";
import FormHelperText from "@mui/joy/FormHelperText";

interface RoleFieldProps {
  value: string;
  onChange: (value: string | null) => void;
  options: string[];
  error?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function RoleField({
  value,
  onChange,
  options,
  error,
  disabled,
  isLoading,
}: RoleFieldProps): React.JSX.Element {
  return (
    <Stack sx={{ flex: 1 }}>
      <Typography
        level="body-sm"
        sx={{
          fontSize: { xs: "12px", sm: "14px" },
          color: "var(--joy-palette-text-primary)",
          mb: 0.5,
          fontWeight: 500,
        }}
      >
        Role <span style={{ color: "var(--joy-palette-danger-500)" }}>*</span>
      </Typography>
      <Autocomplete
        placeholder="Select role"
        value={value || null}
        onChange={(event, newValue) => onChange(newValue)}
        options={options}
        isOptionEqualToValue={(option, val) => option === val}
        disabled={disabled || isLoading}
        slotProps={{
          listbox: {
            placement: 'top',
          },
        }}
        sx={{
          borderRadius: "6px",
          fontSize: { xs: "12px", sm: "14px" },
          border: error
            ? "1px solid var(--joy-palette-danger-500)"
            : undefined,
        }}
      />
      {error && (
        <FormHelperText
          sx={{
            color: "var(--joy-palette-danger-500)",
            fontSize: { xs: "10px", sm: "12px" },
          }}
        >
          {error}
        </FormHelperText>
      )}
    </Stack>
  );
}

