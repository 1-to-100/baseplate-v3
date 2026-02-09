import { createClient } from '@/lib/supabase/client';
import type {
  GetLLMJobsParams,
  GetLLMJobsResponse,
  LLMJobStats,
  LLMJobStatRow,
  LLMJobWithRelations,
  LLMProvider,
  CancelJobResponse,
} from '@/types/llm-jobs';

/**
 * Get paginated list of LLM jobs with optional filters
 */
export async function getLLMJobs(params: GetLLMJobsParams = {}): Promise<GetLLMJobsResponse> {
  const supabase = createClient();
  const page = params.page || 1;
  const perPage = params.perPage || 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from('llm_jobs').select(
    `
      *,
      provider:llm_providers(id, name, slug),
      user:users!user_id(user_id, full_name, email),
      customer:customers!customer_id(customer_id, name)
    `,
    { count: 'exact' }
  );

  // Apply filters
  if (params.status?.length) {
    query = query.in('status', params.status);
  }
  if (params.providerId?.length) {
    query = query.in('provider_id', params.providerId);
  }
  if (params.featureSlug?.length) {
    query = query.in('feature_slug', params.featureSlug);
  }
  if (params.dateFrom) {
    query = query.gte('created_at', params.dateFrom);
  }
  if (params.dateTo) {
    query = query.lte('created_at', params.dateTo);
  }
  if (params.search) {
    // Search in feature_slug, prompt, or error_message
    query = query.or(
      `feature_slug.ilike.%${params.search}%,prompt.ilike.%${params.search}%,error_message.ilike.%${params.search}%`
    );
  }

  // Apply sorting
  const orderBy = params.orderBy || 'created_at';
  const orderDirection = params.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  // Apply pagination
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count || 0;
  return {
    data: (data || []) as LLMJobWithRelations[],
    meta: {
      total,
      page,
      lastPage: Math.ceil(total / perPage) || 1,
      perPage,
    },
  };
}

/**
 * Get a single LLM job by ID with relations
 */
export async function getLLMJobById(jobId: string): Promise<LLMJobWithRelations> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('llm_jobs')
    .select(
      `
      *,
      provider:llm_providers(id, name, slug),
      user:users!user_id(user_id, full_name, email),
      customer:customers!customer_id(customer_id, name)
    `
    )
    .eq('id', jobId)
    .single();

  if (error) throw error;
  return data as LLMJobWithRelations;
}

/**
 * Cancel an LLM job via the llm-cancel edge function
 */
export async function cancelLLMJob(jobId: string): Promise<CancelJobResponse> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<CancelJobResponse>('llm-cancel', {
    body: { job_id: jobId },
  });

  if (error) throw new Error(error.message || 'Failed to cancel job');
  if (!data) throw new Error('No response from cancel endpoint');
  return data;
}

/**
 * Get LLM job statistics using the database function
 */
export async function getLLMJobStats(hours?: number): Promise<LLMJobStats> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('llm_get_job_stats', {
    p_customer_id: null, // Will use RLS to filter by customer
    p_hours: hours ?? null,
  });

  if (error) throw error;

  // Transform the array of status rows into a summary object
  const stats: LLMJobStats = {
    total: 0,
    queued: 0,
    running: 0,
    waiting_llm: 0,
    retrying: 0,
    completed: 0,
    error: 0,
    exhausted: 0,
    cancelled: 0,
    avgDurationSeconds: null,
    oldestJobAgeSeconds: null,
  };

  if (data && Array.isArray(data)) {
    let totalDuration = 0;
    let durationCount = 0;
    let maxOldestAge: number | null = null;

    (data as LLMJobStatRow[]).forEach((row) => {
      const status = row.status as keyof Omit<
        LLMJobStats,
        'total' | 'avgDurationSeconds' | 'oldestJobAgeSeconds'
      >;
      if (status in stats && typeof stats[status] === 'number') {
        (stats[status] as number) = row.count;
      }
      stats.total += row.count;

      if (row.avg_duration_seconds !== null) {
        totalDuration += row.avg_duration_seconds * row.count;
        durationCount += row.count;
      }

      if (row.oldest_job_age_seconds !== null) {
        if (maxOldestAge === null || row.oldest_job_age_seconds > maxOldestAge) {
          maxOldestAge = row.oldest_job_age_seconds;
        }
      }
    });

    if (durationCount > 0) {
      stats.avgDurationSeconds = totalDuration / durationCount;
    }
    stats.oldestJobAgeSeconds = maxOldestAge;
  }

  return stats;
}

/**
 * Get list of active LLM providers
 */
export async function getLLMProviders(): Promise<LLMProvider[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('llm_providers')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return (data || []) as LLMProvider[];
}

/**
 * Get unique feature slugs from jobs (for filter dropdown)
 */
export async function getFeatureSlugs(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('llm_jobs')
    .select('feature_slug')
    .not('feature_slug', 'is', null)
    .order('feature_slug');

  if (error) throw error;

  // Extract unique feature slugs
  const uniqueSlugs = [...new Set((data || []).map((row) => row.feature_slug).filter(Boolean))];
  return uniqueSlugs as string[];
}
