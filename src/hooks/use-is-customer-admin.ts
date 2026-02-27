'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';

export function useIsCustomerAdmin(): boolean | null {
  const [isCustomerAdmin, setIsCustomerAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function checkCustomerAdmin() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('is_customer_admin');

        if (mounted) {
          if (error) {
            console.error('Error checking customer admin:', error);
            setIsCustomerAdmin(null);
          } else {
            setIsCustomerAdmin(data === true);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('Error checking customer admin:', error);
          setIsCustomerAdmin(null);
        }
      }
    }

    void checkCustomerAdmin();

    return () => {
      mounted = false;
    };
  }, []);

  return isCustomerAdmin;
}
