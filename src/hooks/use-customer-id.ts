'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';

export function useCustomerId(): string | null {
  const [customerId, setCustomerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function getCustomerId() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('customer_id');

        if (mounted) {
          if (error) {
            console.error('Error getting customer ID:', error);
            setCustomerId(null);
          } else {
            setCustomerId(data as string);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('Error getting customer ID:', error);
          setCustomerId(null);
        }
      }
    }

    void getCustomerId();

    return () => {
      mounted = false;
    };
  }, []);

  return customerId;
}
