import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export type LLMJobStatus =
  | 'queued'
  | 'running'
  | 'waiting_llm'
  | 'retrying'
  | 'completed'
  | 'error'
  | 'exhausted'
  | 'cancelled'
  | 'post_processing_failed';

export interface LLMJob {
  id: string;
  customer_id: string;
  user_id: string | null;
  provider_id: string;
  prompt: string;
  input: Record<string, unknown>;
  system_prompt: string | null;
  feature_slug: string | null;
  messages: unknown[] | null;
  context: Record<string, unknown>;
  api_method: 'chat' | 'responses';
  status: LLMJobStatus;
  llm_response_id: string | null;
  retry_count: number;
  result_ref: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

export interface LLMJobResult {
  output: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
  response_id?: string;
}

export interface UseJobStatusOptions {
  /** Customer ID for realtime subscription (required for broadcast channel) */
  customerId?: string;
  /** Whether to automatically fetch job on mount */
  enabled?: boolean;
  /** Callback when job status changes */
  onStatusChange?: (status: LLMJobStatus, job: LLMJob) => void;
  /** Callback when job completes successfully */
  onComplete?: (result: LLMJobResult, job: LLMJob) => void;
  /** Callback when job fails */
  onError?: (error: string, job: LLMJob) => void;
}

export interface UseJobStatusReturn {
  /** The current job data */
  job: LLMJob | null;
  /** Whether the job is currently loading */
  isLoading: boolean;
  /** Error if fetching failed */
  error: Error | null;
  /** Current status of the job */
  status: LLMJobStatus | null;
  /** Whether the job is in a terminal state */
  isTerminal: boolean;
  /** Whether the job completed successfully */
  isComplete: boolean;
  /** Whether the job failed */
  isFailed: boolean;
  /** Parsed result if job completed */
  result: LLMJobResult | null;
  /** Error message if job failed */
  errorMessage: string | null;
  /** Refetch job data */
  refetch: () => Promise<void>;
}

// =============================================================================
// Terminal Status Helpers
// =============================================================================

const TERMINAL_STATUSES: LLMJobStatus[] = [
  'completed',
  'error',
  'exhausted',
  'cancelled',
  'post_processing_failed',
];
const FAILED_STATUSES: LLMJobStatus[] = [
  'error',
  'exhausted',
  'cancelled',
  'post_processing_failed',
];

function isTerminalStatus(status: LLMJobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

function isFailedStatus(status: LLMJobStatus): boolean {
  return FAILED_STATUSES.includes(status);
}

// =============================================================================
// Job Fetching
// =============================================================================

async function fetchJob(supabase: SupabaseClient, jobId: string): Promise<LLMJob | null> {
  const { data, error } = await supabase.from('llm_jobs').select('*').eq('id', jobId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Job not found
      return null;
    }
    throw error;
  }

  return data as LLMJob;
}

// =============================================================================
// Hook: useJobStatus
// =============================================================================

/**
 * React hook for tracking LLM job status in real-time.
 *
 * @param jobId - The job ID to track
 * @param options - Hook options including callbacks
 * @returns Job status information and controls
 *
 * @example
 * ```tsx
 * const { job, status, isComplete, result } = useJobStatus(jobId, {
 *   onComplete: (result) => {
 *     console.log('Job completed:', result.output);
 *   },
 *   onError: (error) => {
 *     console.error('Job failed:', error);
 *   }
 * });
 *
 * if (isComplete && result) {
 *   return <div>{result.output}</div>;
 * }
 * ```
 */
export function useJobStatus(
  jobId: string | null | undefined,
  options: UseJobStatusOptions = {}
): UseJobStatusReturn {
  const { customerId, enabled = true, onStatusChange, onComplete, onError } = options;

  const supabaseClient = useMemo<SupabaseClient>(() => createSupabaseClient(), []);
  const queryClient = useQueryClient();

  // Track previous status for change detection
  const [prevStatus, setPrevStatus] = useState<LLMJobStatus | null>(null);

  // Query for initial job fetch
  const {
    data: job,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ['llm-job', jobId],
    queryFn: () => (jobId ? fetchJob(supabaseClient, jobId) : null),
    enabled: enabled && !!jobId,
    staleTime: 5000, // Consider fresh for 5 seconds
    refetchOnWindowFocus: false, // Realtime handles updates
  });

  // Refetch wrapper
  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  // Refetch handler for broadcast updates
  const handleRealtimeUpdate = useCallback(() => {
    queryClient.refetchQueries({ queryKey: ['llm-job', jobId] });
  }, [queryClient, jobId]);

  // Subscribe to private broadcast channel for realtime updates
  useEffect(() => {
    if (!jobId || !enabled || !customerId) return;

    const topic = `llm-jobs:${customerId}`;
    let channel: ReturnType<SupabaseClient['channel']> | null = null;
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const debouncedUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        handleRealtimeUpdate();
        debounceTimer = null;
      }, 500);
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
        .on('broadcast', { event: 'INSERT' }, ({ payload }) => {
          if (payload?.id === jobId) debouncedUpdate();
        })
        .on('broadcast', { event: 'UPDATE' }, ({ payload }) => {
          if (payload?.id === jobId) debouncedUpdate();
        })
        .subscribe();
    }

    setupChannel();

    const {
      data: { subscription: authSub },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabaseClient.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      authSub.unsubscribe();
      if (channel) supabaseClient.removeChannel(channel);
    };
  }, [jobId, enabled, customerId, supabaseClient, handleRealtimeUpdate]);

  // Handle status change callbacks
  useEffect(() => {
    if (!job) return;

    const currentStatus = job.status;

    // Detect status change
    if (prevStatus !== null && prevStatus !== currentStatus) {
      onStatusChange?.(currentStatus, job);

      // Handle completion
      if (currentStatus === 'completed' && job.result_ref) {
        try {
          const result = JSON.parse(job.result_ref) as LLMJobResult;
          onComplete?.(result, job);
        } catch {
          console.error('Failed to parse job result');
        }
      }

      // Handle failure
      if (isFailedStatus(currentStatus)) {
        onError?.(job.error_message || 'Job failed', job);
      }
    }

    setPrevStatus(currentStatus);
  }, [job, prevStatus, onStatusChange, onComplete, onError]);

  // Derived state
  const status = job?.status ?? null;
  const isTerminal = status ? isTerminalStatus(status) : false;
  const isComplete = status === 'completed';
  const isFailed = status ? isFailedStatus(status) : false;

  // Parse result if complete
  const result = useMemo<LLMJobResult | null>(() => {
    if (!job?.result_ref || !isComplete) return null;
    try {
      return JSON.parse(job.result_ref) as LLMJobResult;
    } catch {
      return null;
    }
  }, [job?.result_ref, isComplete]);

  return {
    job: job ?? null,
    isLoading,
    error: error as Error | null,
    status,
    isTerminal,
    isComplete,
    isFailed,
    result,
    errorMessage: job?.error_message ?? null,
    refetch,
  };
}

// =============================================================================
// Hook: useJobStatusPolling (Fallback for environments without Realtime)
// =============================================================================

export interface UseJobStatusPollingOptions extends UseJobStatusOptions {
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number;
}

/**
 * Alternative hook that uses polling instead of Realtime.
 * Use this in environments where Realtime may not be available.
 */
export function useJobStatusPolling(
  jobId: string | null | undefined,
  options: UseJobStatusPollingOptions = {}
): UseJobStatusReturn {
  const { enabled = true, pollInterval = 2000, onStatusChange, onComplete, onError } = options;

  const supabaseClient = useMemo<SupabaseClient>(() => createSupabaseClient(), []);
  const [prevStatus, setPrevStatus] = useState<LLMJobStatus | null>(null);

  const {
    data: job,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ['llm-job', jobId],
    queryFn: () => (jobId ? fetchJob(supabaseClient, jobId) : null),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      // Stop polling once in terminal state
      const currentJob = query.state.data as LLMJob | null | undefined;
      if (currentJob && isTerminalStatus(currentJob.status)) {
        return false;
      }
      return pollInterval;
    },
    refetchOnWindowFocus: true,
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  // Handle status change callbacks (same as realtime version)
  useEffect(() => {
    if (!job) return;

    const currentStatus = job.status;

    if (prevStatus !== null && prevStatus !== currentStatus) {
      onStatusChange?.(currentStatus, job);

      if (currentStatus === 'completed' && job.result_ref) {
        try {
          const result = JSON.parse(job.result_ref) as LLMJobResult;
          onComplete?.(result, job);
        } catch {
          console.error('Failed to parse job result');
        }
      }

      if (isFailedStatus(currentStatus)) {
        onError?.(job.error_message || 'Job failed', job);
      }
    }

    setPrevStatus(currentStatus);
  }, [job, prevStatus, onStatusChange, onComplete, onError]);

  const status = job?.status ?? null;
  const isTerminal = status ? isTerminalStatus(status) : false;
  const isComplete = status === 'completed';
  const isFailed = status ? isFailedStatus(status) : false;

  const result = useMemo<LLMJobResult | null>(() => {
    if (!job?.result_ref || !isComplete) return null;
    try {
      return JSON.parse(job.result_ref) as LLMJobResult;
    } catch {
      return null;
    }
  }, [job?.result_ref, isComplete]);

  return {
    job: job ?? null,
    isLoading,
    error: error as Error | null,
    status,
    isTerminal,
    isComplete,
    isFailed,
    result,
    errorMessage: job?.error_message ?? null,
    refetch,
  };
}
