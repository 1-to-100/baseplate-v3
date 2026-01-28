'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';

export interface ChargeCreditsParams {
  customer_id: string;
  amount: number;
  reason: string;
  action_code: string;
  reference_id?: string | null;
}

export function useChargeCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ChargeCreditsParams) => {
      const supabase = createClient();
      const { error } = await supabase.rpc('charge_credits', {
        p_customer_id: params.customer_id,
        p_amount: params.amount,
        p_reason: params.reason,
        p_action_code: params.action_code,
        p_reference_id: params.reference_id ?? null,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate credit balance to refetch
      queryClient.invalidateQueries({ queryKey: ['credit-balance'] });
    },
  });
}
