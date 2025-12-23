import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useSystemRole() {
  return useQuery({
    queryKey: ['style-guide', 'is-system-role'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('is_system_role');

      if (error) {
        throw new Error(error.message);
      }

      return Boolean(data);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

