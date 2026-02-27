'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';

export function useIsSystemRole(): boolean | null {
  const [isSystemRole, setIsSystemRole] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function checkSystemRole() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('is_system_role');

        if (mounted) {
          if (error) {
            console.error('Error checking system role:', error);
            setIsSystemRole(null);
          } else {
            setIsSystemRole(data === true);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('Error checking system role:', error);
          setIsSystemRole(null);
        }
      }
    }

    void checkSystemRole();

    return () => {
      mounted = false;
    };
  }, []);

  return isSystemRole;
}
