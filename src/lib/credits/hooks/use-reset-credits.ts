'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';

export interface ResetCreditsParams {
  reason?: string;
  reference_id?: string | null;
  action_code?: string;
}

export function useResetCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ResetCreditsParams = {}) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('reset_my_credits', {
        p_reason: params.reason ?? 'Period reset',
        p_reference_id: params.reference_id ?? null,
        p_action_code: params.action_code ?? 'period_reset',
      });

      if (error) {
        throw error;
      }

      const row = data?.[0];
      if (row && row.success === false) {
        throw new Error('Failed to reset credits');
      }

      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-balance'] });
    },
  });
}
