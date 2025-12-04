'use client';

import * as React from 'react';
import { Autocomplete, FormControl } from '@mui/joy';
import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '@/lib/api/customers';
import { authService } from '@/lib/auth/auth-service';
import { useUserInfo } from '@/hooks/use-user-info';
import { useState, useEffect } from 'react';

export function CustomerSelect(): React.JSX.Element {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  const { userInfo } = useUserInfo();
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  // Set initial selected customer from JWT context or user info
  useEffect(() => {
    const loadSelectedCustomer = async () => {
      try {
        // First, try to get customer from JWT app_metadata (for context switching)
        const context = await authService.getCurrentContext();

        if (context.customerId) {
          // Use customer from JWT context (System Admin switched context)
          setSelectedCustomerId(context.customerId);
        } else if (userInfo?.customerId) {
          // Fall back to user's default customer
          setSelectedCustomerId(userInfo.customerId);
        }
      } catch (error) {
        console.error('Failed to load customer context:', error);
        // Fall back to user's default customer
        if (userInfo?.customerId) {
          setSelectedCustomerId(userInfo.customerId);
        }
      }
    };

    void loadSelectedCustomer();
  }, [userInfo?.customerId]);

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
        placeholder='Select customer'
        options={customers || []}
        getOptionLabel={(customer) => customer.name.slice(0, 20)}
        getOptionKey={(customer) => customer.id}
        value={customers?.find((customer) => customer.id === selectedCustomerId) || null}
        disabled={isChanging}
        onChange={async (_, newValue) => {
          setIsChanging(true);
          try {
            if (newValue) {
              // SECURE: Backend validates and issues new JWT with customer context
              await authService.refreshWithContext({
                customerId: newValue.id,
              });
              setSelectedCustomerId(newValue.id);
            } else {
              // Clear customer context
              await authService.clearContext();
              setSelectedCustomerId(null);
            }
            // Reload to use new token with updated context
            window.location.reload();
          } catch (error) {
            console.error('Failed to switch customer:', error);
            alert('You do not have access to this customer');
            setIsChanging(false);
          }
        }}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        sx={{
          borderRadius: '25px',
          fontSize: { xs: '12px', sm: '14px' },
          minWidth: { xs: '100%', md: '220px' },
          maxWidth: { xs: '100%', md: '220px' },
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
