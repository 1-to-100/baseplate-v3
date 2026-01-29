'use client';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

import type { CreditBalance } from '../types';

/**
 * Fetches credit balance with period info.
 * Returns balance, period_limit, period_used, period_remaining, etc.
 */
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
        balance: row.balance ?? 0,
        period_limit: row.period_limit ?? 0,
        period_used: row.period_used ?? 0,
        period_remaining: row.period_remaining ?? 0,
        period_starts_at: row.period_starts_at,
        period_ends_at: row.period_ends_at,
        subscription_name: row.subscription_name,
        updated_at: row.updated_at,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
