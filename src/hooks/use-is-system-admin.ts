'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';

export function useIsSystemAdmin(): boolean | null {
  const [isSystemAdmin, setIsSystemAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function checkSystemAdmin() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('is_system_admin');

        if (mounted) {
          if (error) {
            console.error('Error checking system admin:', error);
            setIsSystemAdmin(null);
          } else {
            setIsSystemAdmin(data === true);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('Error checking system admin:', error);
          setIsSystemAdmin(null);
        }
      }
    }

    void checkSystemAdmin();

    return () => {
      mounted = false;
    };
  }, []);

  return isSystemAdmin;
}
