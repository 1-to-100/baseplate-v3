import { useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import {
  getLLMJobs,
  getLLMJobById,
  cancelLLMJob,
  getLLMJobStats,
  getLLMProviders,
  getFeatureSlugs,
} from '@/lib/api/llm-jobs';
import type { GetLLMJobsParams } from '@/types/llm-jobs';
import { toast } from '@/components/core/toaster';

/**
 * Hook for fetching paginated LLM jobs with filters
 */
export function useLLMJobs(params: GetLLMJobsParams) {
  return useQuery({
    queryKey: ['llm-jobs', params],
    queryFn: () => getLLMJobs(params),
    staleTime: 0, // Override global default so realtime invalidation triggers immediate refetch
  });
}

/**
 * Hook for fetching a single LLM job by ID
 */
export function useLLMJob(jobId: string | null) {
  return useQuery({
    queryKey: ['llm-job', jobId],
    queryFn: () => getLLMJobById(jobId!),
    enabled: !!jobId,
  });
}

/**
 * Hook for fetching LLM job statistics
 */
export function useLLMJobStats(hours?: number) {
  return useQuery({
    queryKey: ['llm-job-stats', hours ?? 'all'],
    queryFn: () => getLLMJobStats(hours),
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refresh stats every minute
  });
}

/**
 * Hook for fetching active LLM providers
 */
export function useLLMProviders() {
  return useQuery({
    queryKey: ['llm-providers'],
    queryFn: getLLMProviders,
    staleTime: 300000, // 5 minutes - providers don't change often
  });
}

/**
 * Hook for fetching unique feature slugs
 */
export function useFeatureSlugs() {
  return useQuery({
    queryKey: ['llm-feature-slugs'],
    queryFn: getFeatureSlugs,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook for cancelling an LLM job
 */
export function useCancelLLMJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelLLMJob,
    onSuccess: (data) => {
      if (data.cancelled) {
        toast.success('Job cancelled successfully');
      } else {
        toast.info(data.message);
      }
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['llm-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['llm-job'] });
      queryClient.invalidateQueries({ queryKey: ['llm-job-stats'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel job');
    },
  });
}

/**
 * Hook for bulk cancelling multiple LLM jobs
 */
export function useBulkCancelLLMJobs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobIds: string[]) => {
      const results = await Promise.allSettled(jobIds.map((id) => cancelLLMJob(id)));
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      return { succeeded, failed, total: jobIds.length };
    },
    onSuccess: (data) => {
      if (data.failed === 0) {
        toast.success(`${data.succeeded} job(s) cancelled successfully`);
      } else if (data.succeeded > 0) {
        toast.warning(`${data.succeeded} cancelled, ${data.failed} failed`);
      } else {
        toast.error('Failed to cancel jobs');
      }
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['llm-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['llm-job-stats'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel jobs');
    },
  });
}

// =============================================================================
// Real-time Subscription Hook
// =============================================================================

export interface UseLLMJobsRealtimeOptions {
  /** Whether real-time updates are enabled (default: true) */
  enabled?: boolean;
  /** Debounce time in ms to batch rapid updates (default: 1000) */
  debounceMs?: number;
  /** Customer-scoped channel topic, e.g. 'llm-jobs:{customer_id}' */
  topic: string;
}

/**
 * Hook that subscribes to real-time changes on the llm_jobs table
 * using Supabase private Broadcast channels with RLS authorization.
 *
 * The database trigger broadcasts to a customer-scoped topic
 * (`llm-jobs:{customer_id}`). RLS on `realtime.messages` enforces that
 * only users who pass `can_access_customer()` can subscribe.
 *
 * When the customer context changes, pass the new topic and the hook
 * automatically tears down the old subscription and creates a new one.
 *
 * @example
 * ```tsx
 * useLLMJobsRealtime({ topic: `llm-jobs:${customerId}` });
 * const { data } = useLLMJobs(params); // Data auto-updates
 * ```
 */
export function useLLMJobsRealtime(options: UseLLMJobsRealtimeOptions): void {
  const { enabled = true, debounceMs = 1000, topic } = options;
  const supabaseClient = useMemo<SupabaseClient>(() => createSupabaseClient(), []);
  const queryClient = useQueryClient();

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.refetchQueries({ queryKey: ['llm-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['llm-job-stats'] });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || !topic) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<SupabaseClient['channel']> | null = null;
    let cancelled = false;

    const debouncedUpdate = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        handleRealtimeUpdate();
        debounceTimer = null;
      }, debounceMs);
    };

    async function setupChannel() {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (cancelled) return;

      if (session?.access_token) {
        supabaseClient.realtime.setAuth(session.access_token);
      }

      channel = supabaseClient
        .channel(topic, { config: { private: true } })
        .on('broadcast', { event: 'INSERT' }, () => debouncedUpdate())
        .on('broadcast', { event: 'UPDATE' }, () => debouncedUpdate())
        .on('broadcast', { event: 'DELETE' }, () => debouncedUpdate())
        .subscribe();
    }

    setupChannel();

    // Refresh the realtime token when the auth session refreshes
    const {
      data: { subscription: authSubscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabaseClient.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      cancelled = true;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      authSubscription.unsubscribe();
      if (channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, [enabled, debounceMs, topic, supabaseClient, handleRealtimeUpdate]);
}
