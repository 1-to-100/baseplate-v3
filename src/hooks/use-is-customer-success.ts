'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';

export function useIsCustomerSuccess(): boolean | null {
  const [isCustomerSuccess, setIsCustomerSuccess] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function checkCustomerSuccess() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('is_customer_success');

        if (mounted) {
          if (error) {
            console.error('Error checking customer success:', error);
            setIsCustomerSuccess(null);
          } else {
            setIsCustomerSuccess(data === true);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('Error checking customer success:', error);
          setIsCustomerSuccess(null);
        }
      }
    }

    void checkCustomerSuccess();

    return () => {
      mounted = false;
    };
  }, []);

  return isCustomerSuccess;
}
