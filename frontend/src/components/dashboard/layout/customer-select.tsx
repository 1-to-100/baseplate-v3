'use client';

import * as React from 'react';
import { Autocomplete, FormControl, Typography } from "@mui/joy";
import { useQuery } from "@tanstack/react-query";
import { getCustomers } from "@/lib/api/customers";
import { useEffect } from 'react';
import { useState } from 'react';

export function CustomerSelect(): React.JSX.Element {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  useEffect(() => {
    const storedCustomerId = localStorage.getItem('selectedCustomerId');
    if (storedCustomerId) {
      const numericId = parseInt(storedCustomerId, 10);
      setSelectedCustomerId(numericId);
    }
  }, []);

  return (
    <FormControl>
      {/* {selectedCustomerId && (
        <Typography
          level="body-xs"
          sx={{
            position: 'absolute',
            top: '-8px',
            left: '8px',
            px: '4px',
            zIndex: 10000,
            color: 'var(--joy-palette-text-secondary)',
            fontSize: '10px',
            fontWeight: '300',
          }}
        >
          Select customer
        </Typography>
      )} */}
      <Autocomplete
        placeholder="Select customer"
        options={customers || []}
        getOptionLabel={(customer) => customer.name.slice(0, 20)}
        getOptionKey={(customer) => customer.id}
        value={customers?.find((customer) => customer.id === selectedCustomerId) || null}
        onChange={(_, newValue) => {
          if (newValue) {
            setSelectedCustomerId(newValue.id);
            localStorage.setItem('selectedCustomerId', newValue.id.toString());
          } else {
            setSelectedCustomerId(null);
            localStorage.removeItem('selectedCustomerId');
          }
          window.location.reload();
        }}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        sx={{
          borderRadius: "25px",
          fontSize: { xs: "12px", sm: "14px" },
          minWidth: { xs: "100%", md: "220px" },
          maxWidth: { xs: "100%", md: "220px" },
          '& .MuiInput-root': {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          padding: '0px 16px',
        }}
      />
    </FormControl>
  );
} 