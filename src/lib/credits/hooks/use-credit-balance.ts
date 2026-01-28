'use client';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

import type { CreditBalance } from '../types';

export function useCreditBalance() {
  return useQuery<CreditBalance | null>({
    queryKey: ['credit-balance'],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('get_credit_balance');

      if (error) {
        console.error('Failed to fetch credit balance:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const row = data[0];
      return {
        customer_id: row.customer_id,
        balance: row.balance,
        updated_at: row.updated_at,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
