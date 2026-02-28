import { ApiError } from '../errors.ts';
import type { SupabaseClient } from '../supabase.ts';

/**
 * Consumes one rate-limit unit for the given customer.
 * Throws ApiError(429) if the customer has exceeded their monthly quota.
 */
export async function consumeRateLimit(
  customerId: string,
  userClient: SupabaseClient
): Promise<void> {
  const { data: rlData, error: rlError } = await userClient.rpc('llm_increment_rate_limit', {
    p_customer_id: customerId,
    p_period: 'monthly',
    p_default_quota: 1000,
  });

  if (rlError) {
    throw new ApiError('Failed to check rate limit', 500);
  }

  if (!rlData) {
    const { data: limitCheck } = await userClient.rpc('llm_check_rate_limit', {
      p_customer_id: customerId,
      p_period: 'monthly',
    });
    const limit = limitCheck?.[0];
    throw new ApiError(
      `Rate limit exceeded. Used ${limit?.used ?? '?'}/${limit?.quota ?? '?'} requests this month.`,
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }
}
