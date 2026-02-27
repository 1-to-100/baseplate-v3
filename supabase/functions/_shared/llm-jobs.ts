import type { SupabaseClient } from './supabase.ts';

// =============================================================================
// Types
// =============================================================================

export interface CreateJobInput {
  customer_id: string;
  user_id: string;
  provider_id: string;
  prompt: string;
  input?: Record<string, unknown>;
  system_prompt?: string | null;
  feature_slug?: string;
  messages?: unknown[] | null;
  context?: Record<string, unknown>;
  api_method?: 'chat' | 'responses';
  status?: 'queued' | 'running';
}

export interface CreateJobResult {
  id: string;
  status: string;
  model: string;
  [key: string]: unknown;
}

interface CreateJobOptions {
  /** Whether to enqueue to pgmq dispatch queue. Defaults to true when status is 'queued', false when 'running'. */
  enqueue?: boolean;
  /** Columns to select after insert. Defaults to 'id, status'. */
  select?: string;
}

// =============================================================================
// Profile Resolution
// =============================================================================

interface ResolvedProfile {
  id: string;
  model: string;
}

/**
 * Resolves the provider profile for a job.
 *
 * Lookup chain: feature_slug-specific profile → 'default' profile → throw.
 */
async function resolveProfile(
  providerId: string,
  featureSlug: string | undefined,
  supabase: SupabaseClient,
): Promise<ResolvedProfile> {
  const names = featureSlug ? [featureSlug, 'default'] : ['default'];

  for (const name of names) {
    const { data } = await supabase
      .from('llm_provider_profiles')
      .select('id, model')
      .eq('provider_id', providerId)
      .eq('name', name)
      .single();

    if (data) {
      return data;
    }
  }

  throw new Error(
    `No provider profile found for provider '${providerId}'` +
    (featureSlug ? ` (tried '${featureSlug}' and 'default')` : ` (tried 'default')`)
  );
}

// =============================================================================
// Shared Helper
// =============================================================================

/**
 * Creates an llm_jobs record and optionally enqueues it to the pgmq dispatch queue.
 *
 * Both llm-query (single job) and prepare-extractions (batch of 3) call this
 * to keep the insert-then-enqueue pattern in one place.
 *
 * Resolves the provider profile (feature_slug → default → throw) and stores
 * both `provider_profile_id` (audit trail) and `model` (fast reads) on the
 * job row.
 */
export async function createAndEnqueueJob(
  input: CreateJobInput,
  supabase: SupabaseClient,
  options?: CreateJobOptions,
): Promise<CreateJobResult> {
  const status = input.status ?? 'queued';
  const select = options?.select ?? 'id, status';
  const shouldEnqueue = options?.enqueue ?? (status === 'queued');

  const profile = await resolveProfile(input.provider_id, input.feature_slug, supabase);

  const { data, error } = await supabase
    .from('llm_jobs')
    .insert({
      customer_id: input.customer_id,
      user_id: input.user_id,
      provider_id: input.provider_id,
      prompt: input.prompt,
      input: input.input ?? {},
      system_prompt: input.system_prompt,
      feature_slug: input.feature_slug,
      messages: input.messages,
      context: input.context,
      api_method: input.api_method,
      provider_profile_id: profile.id,
      model: profile.model,
      status,
      started_at: status === 'running' ? new Date().toISOString() : null,
    })
    .select(select)
    .single();

  if (error) {
    console.error('Failed to create job:', error);
    throw new Error('Failed to create LLM job');
  }

  // Cast needed: Supabase returns GenericStringError when select() receives a runtime string
  const job = data as unknown as CreateJobResult;
  job.model = profile.model;

  if (shouldEnqueue) {
    const { error: enqueueError } = await supabase.rpc('llm_enqueue_job', {
      p_job_id: job.id,
    });
    if (enqueueError) {
      console.error('Failed to enqueue job to dispatch queue:', enqueueError);
      throw new Error('Job created but failed to enqueue to dispatch queue');
    }
  }

  return job;
}
