import { ApiError } from '../errors.ts';
import type { SupabaseClient } from '../supabase.ts';

/**
 * Fetches an active provider by slug.
 */
export async function fetchActiveProviderBySlug(
  userClient: SupabaseClient,
  slug: string
): Promise<{ id: string }> {
  const { data, error } = await userClient
    .from('llm_providers')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new ApiError(`${slug} provider not found or inactive`, 500);
  }

  return { id: data.id };
}

/**
 * Fetches the active OpenAI provider row.
 */
export async function fetchOpenAIProvider(
  userClient: SupabaseClient
): Promise<{ id: string }> {
  return fetchActiveProviderBySlug(userClient, 'openai');
}
