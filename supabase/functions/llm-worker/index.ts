/// <reference lib="deno.ns" />
/**
 * LLM Worker Edge Function
 *
 * Reads jobs from the pgmq dispatch queue and processes them:
 * 1. Reads up to N messages from pgmq (atomic dequeue via FOR UPDATE SKIP LOCKED)
 * 2. For each message, loads the job from llm_jobs and sets status to 'running'
 * 3. Routes OpenAI to background mode, executes Anthropic/Gemini synchronously
 * 4. On success: deletes pgmq message. On retryable failure: leaves message (VT redelivers)
 *
 * This worker is designed to be invoked by:
 * - pg_cron scheduled sweep (every 60s)
 * - Direct invocation for immediate processing
 *
 * @see llm-query for the entry point that creates jobs and enqueues to pgmq
 * @see llm-webhook for webhook handling (OpenAI async responses)
 */

import { handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import type { SupabaseClient } from '../_shared/supabase.ts';
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts';
import {
  providers,
  LLMError,
  withLogging,
  sanitizeInputParams,
  isValidProvider,
  withTimeout,
  callOpenAIChat,
  callAnthropic as sharedCallAnthropic,
  callGemini as sharedCallGemini,
} from '../_shared/llm/index.ts';
import type {
  LLMProvider,
  LLMResult,
  ProviderConfig,
  LLMProviders,
  LLMCallParams,
} from '../_shared/llm/index.ts';
import {
  notifyJobStarted,
  notifyJobCompleted,
  notifyJobFailed,
  notifyJobExhausted,
} from '../_shared/llm-notifications.ts';
import { secureCompare } from '../_shared/crypto.ts';
import { getResponseProcessor as getResponseProcessorDefault } from '../_shared/response-processors/index.ts';
import type { ResponseProcessor } from '../_shared/response-processors/index.ts';

// =============================================================================
// Configuration
// =============================================================================

/** Visibility timeout in seconds -- message reappears after this if not deleted */
const VISIBILITY_TIMEOUT_SECONDS = 300;

/** Maximum jobs to process per invocation */
const MAX_JOBS_PER_INVOCATION = 10;

// =============================================================================
// Types
// =============================================================================

/**
 * LLM job record from database.
 */
interface LLMJob {
  id: string;
  customer_id: string;
  user_id: string | null;
  provider_id: string;
  prompt: string;
  input: Record<string, unknown>;
  system_prompt: string | null;
  feature_slug: string | null;
  status: string;
  retry_count: number;
  created_at: string;
  messages: unknown[] | null;
  context: Record<string, unknown>;
  api_method: 'chat' | 'responses';
  model: string;
}

/**
 * pgmq message from dispatch queue.
 */
interface QueueMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: { job_id: string };
}

/**
 * Result of processing a single job.
 */
interface JobResult {
  job_id: string;
  status: string;
  message?: string;
}

/**
 * Worker response returned to caller.
 */
interface WorkerResponse {
  processed: boolean;
  count?: number;
  results?: JobResult[];
  message?: string;
}

// Re-export for test imports
export type { LLMProviders };

/**
 * Dependencies that can be injected for testing.
 */
export interface HandlerDeps {
  /** Supabase service client factory */
  createServiceClient: () => SupabaseClient;
  /** Environment variable accessor (optional, defaults to Deno.env.get) */
  getEnv?: (key: string) => string | undefined;
  /** LLM provider clients (optional, defaults to real SDKs) */
  llmProviders?: LLMProviders;
  /** Response processor resolver (optional, defaults to registry) */
  getResponseProcessor?: (slug: string | null | undefined) => ResponseProcessor | null;
}

/**
 * Default dependencies using real implementations.
 */
const defaultDeps: HandlerDeps = {
  createServiceClient,
  llmProviders: providers,
};

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Create a handler with injectable dependencies (for testing).
 */
export function createHandler(deps: HandlerDeps = defaultDeps) {
  // Use provided LLM providers or fall back to defaults
  const llmProviders = deps.llmProviders || providers;
  const resolveProcessor = deps.getResponseProcessor || getResponseProcessorDefault;

  return async function handler(req: Request): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Verify internal queue authentication
    const getEnv = deps.getEnv || ((key: string) => Deno.env.get(key));
    const queueSecret = getEnv('QUEUE_SECRET')?.trim();
    if (!queueSecret) {
      console.error('QUEUE_SECRET not configured');
      return createErrorResponse(new ApiError('Server misconfiguration', 500));
    }

    const provided = req.headers.get('x-queue-secret')?.trim() ?? '';
    if (!provided || !(await secureCompare(provided, queueSecret))) {
      return createErrorResponse(new ApiError('Unauthorized', 401));
    }

    try {
      const supabase = deps.createServiceClient();

      // 1. Read messages from pgmq dispatch queue
      const messages = await readFromQueue(supabase);

      if (!messages || messages.length === 0) {
        const response: WorkerResponse = {
          processed: false,
          message: 'No jobs to process',
        };
        return createSuccessResponse(response);
      }

      // 2. Process each message
      const results: JobResult[] = [];
      for (const msg of messages) {
        const result = await processQueueMessage(
          supabase,
          msg,
          llmProviders,
          resolveProcessor
        );
        results.push(result);
      }

      const response: WorkerResponse = {
        processed: true,
        count: results.length,
        results,
      };
      return createSuccessResponse(response);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

/**
 * Main request handler - exported for direct testing without DI.
 */
export const handler = createHandler();

// Start the server - Supabase Edge Functions runtime requires this
Deno.serve(handler);

// =============================================================================
// Queue Operations (pgmq via RPC wrappers)
// =============================================================================

/**
 * Reads messages from the pgmq dispatch queue.
 */
async function readFromQueue(supabase: SupabaseClient): Promise<QueueMessage[]> {
  const { data, error } = await supabase.rpc('llm_read_dispatch_queue', {
    p_vt: VISIBILITY_TIMEOUT_SECONDS,
    p_qty: MAX_JOBS_PER_INVOCATION,
  });

  if (error) {
    console.error('Error reading from dispatch queue:', error);
    throw new ApiError('Failed to read from dispatch queue', 500);
  }

  return data || [];
}

/**
 * Deletes a processed message from the dispatch queue.
 */
async function deleteMessage(supabase: SupabaseClient, msgId: number): Promise<void> {
  const { error } = await supabase.rpc('llm_delete_dispatch_message', {
    p_msg_id: msgId,
  });

  if (error) {
    console.error(`Error deleting pgmq message ${msgId}:`, error);
  }
}

/**
 * Archives a message (preserves history in pgmq archive table).
 */
async function archiveMessage(supabase: SupabaseClient, msgId: number): Promise<void> {
  const { error } = await supabase.rpc('llm_archive_dispatch_message', {
    p_msg_id: msgId,
  });

  if (error) {
    console.error(`Error archiving pgmq message ${msgId}:`, error);
  }
}

// =============================================================================
// Message Processing
// =============================================================================

/**
 * Processes a single queue message: load job, execute LLM call, update status.
 */
async function processQueueMessage(
  supabase: SupabaseClient,
  msg: QueueMessage,
  llmProviders: LLMProviders,
  resolveProcessor: (slug: string | null | undefined) => ResponseProcessor | null
): Promise<JobResult> {
  const jobId = msg.message?.job_id;
  if (!jobId) {
    console.warn('Invalid pgmq message: no job_id', msg.msg_id);
    await archiveMessage(supabase, msg.msg_id);
    return { job_id: 'unknown', status: 'skipped', message: 'Invalid message: no job_id' };
  }

  // Load and claim the job from llm_jobs
  const job = await loadAndClaimJob(supabase, jobId);
  if (!job) {
    // Job not found or not in claimable state (already running/completed/cancelled)
    await deleteMessage(supabase, msg.msg_id);
    return { job_id: jobId, status: 'skipped', message: 'Job not claimable' };
  }

  console.log(`Processing job ${job.id} for customer ${job.customer_id}`);

  // Notify job started (non-blocking)
  if (job.user_id) {
    notifyJobStarted(supabase, {
      jobId: job.id,
      userId: job.user_id,
      customerId: job.customer_id,
      featureSlug: job.feature_slug,
    }).catch((err) => console.error('Failed to send job started notification:', err));
  }

  // Load provider configuration
  const provider = await getProvider(supabase, job.provider_id);

  // Validate provider slug
  if (!isValidProvider(provider.slug)) {
    await updateJobFailed(supabase, job.id, `Unsupported provider: ${provider.slug}`);
    await deleteMessage(supabase, msg.msg_id);
    return { job_id: job.id, status: 'failed', message: `Unsupported provider: ${provider.slug}` };
  }

  // Model is stored directly on the job row at creation time
  if (!job.model) {
    await updateJobFailed(supabase, job.id, 'Job has no model — missing profile configuration');
    await deleteMessage(supabase, msg.msg_id);
    return { job_id: job.id, status: 'failed', message: 'No model configured' };
  }

  const model = job.model;

  // OpenAI: background submission
  if (provider.slug === 'openai') {
    return await processOpenAIBackground(supabase, job, provider, msg.msg_id, llmProviders, model);
  }

  // Anthropic/Gemini: synchronous execution
  return await processSynchronous(supabase, job, provider, msg.msg_id, llmProviders, resolveProcessor, model);
}

/**
 * Loads a job from llm_jobs and atomically sets status to 'running'.
 * Returns null if job is not in a claimable state.
 */
async function loadAndClaimJob(supabase: SupabaseClient, jobId: string): Promise<LLMJob | null> {
  const selectCols =
    'id, customer_id, user_id, provider_id, prompt, input, system_prompt, feature_slug, status, retry_count, created_at, messages, context, api_method, model';

  const { data, error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .in('status', ['queued', 'retrying'])
    .select(selectCols)
    .maybeSingle();

  if (error) {
    console.error(`Error claiming job ${jobId}:`, error);
    return null;
  }

  return data;
}

// =============================================================================
// OpenAI Background Processing
// =============================================================================

/**
 * Submits an OpenAI job in background mode and manages pgmq lifecycle.
 */
async function processOpenAIBackground(
  supabase: SupabaseClient,
  job: LLMJob,
  provider: ProviderConfig,
  msgId: number,
  llmProviders: LLMProviders,
  model: string,
): Promise<JobResult> {
  try {
    const { responseId } = await withTimeout(
      () => submitOpenAIBackground(job, provider, llmProviders, model),
      provider
    );
    const updated = await updateJobWaitingLLM(supabase, job.id, responseId);

    // Job handed off to OpenAI -- delete pgmq message (webhook handles completion)
    await deleteMessage(supabase, msgId);

    if (!updated) {
      return { job_id: job.id, status: 'skipped', message: 'Job cancelled during processing' };
    }

    console.log(`Job ${job.id} submitted to OpenAI background mode (response: ${responseId})`);
    return { job_id: job.id, status: 'waiting_llm' };
  } catch (rawSubmitError) {
    // H6: Normalize SDK errors so retryability (429, 500) is detected correctly
    const submitError = rawSubmitError instanceof LLMError
      ? rawSubmitError
      : LLMError.fromProviderError('openai', rawSubmitError);
    const errorMessage = submitError.message;
    const isRetryable = submitError.retryable;

    console.error(`Background submission error for job ${job.id}:`, errorMessage);

    if (isRetryable && job.retry_count < provider.max_retries) {
      const retryUpdated = await updateJobForRetry(supabase, job.id, errorMessage, job.retry_count);
      if (!retryUpdated) {
        await deleteMessage(supabase, msgId);
        return { job_id: job.id, status: 'skipped', message: 'Job cancelled during processing' };
      }
      // Do NOT delete pgmq message -- VT will redeliver for retry
      return {
        job_id: job.id,
        status: 'retrying',
        message: `Scheduled for retry (${job.retry_count + 1}/${provider.max_retries})`,
      };
    } else {
      const failUpdated = await updateJobFailed(supabase, job.id, errorMessage);
      // Non-retryable or exhausted -- archive the message
      await archiveMessage(supabase, msgId);

      if (!failUpdated) {
        return { job_id: job.id, status: 'skipped', message: 'Job cancelled during processing' };
      }

      if (job.user_id) {
        notifyJobExhausted(supabase, {
          jobId: job.id,
          userId: job.user_id,
          customerId: job.customer_id,
          featureSlug: job.feature_slug,
          errorMessage,
        }).catch((err) => console.error('Failed to send job exhausted notification:', err));
      }

      return {
        job_id: job.id,
        status: 'exhausted',
        message: isRetryable ? 'Max retries exceeded' : 'Non-retryable error',
      };
    }
  }
}

// =============================================================================
// Synchronous Processing (Anthropic/Gemini)
// =============================================================================

/**
 * Executes a synchronous LLM call and manages pgmq lifecycle.
 */
async function processSynchronous(
  supabase: SupabaseClient,
  job: LLMJob,
  provider: ProviderConfig,
  msgId: number,
  llmProviders: LLMProviders,
  resolveProcessor: (slug: string | null | undefined) => ResponseProcessor | null,
  model: string,
): Promise<JobResult> {
  try {
    const result = await withTimeout(
      () => executeLLMCall(job, provider, llmProviders, model),
      provider
    );

    // Run response processor if registered for this feature
    const processor = resolveProcessor(job.feature_slug);
    if (processor) {
      // C3: Re-check job status before running processor (prevent domain writes on cancelled jobs)
      const { data: currentJob } = await supabase
        .from('llm_jobs')
        .select('status')
        .eq('id', job.id)
        .single();

      if (!currentJob || currentJob.status !== 'running') {
        console.warn(`Job ${job.id} status changed to '${currentJob?.status}' before processor — skipping`);
        await deleteMessage(supabase, msgId);
        return { job_id: job.id, status: 'skipped', message: 'Job status changed before processing' };
      }

      try {
        const safeContext = { ...job.context, customer_id: job.customer_id };
        await processor(supabase, result.output, safeContext);
      } catch (ppError) {
        const ppMessage = ppError instanceof Error ? ppError.message : 'Post-processing failed';
        console.error(`Post-processing failed for job ${job.id}:`, ppMessage);
        const ppUpdated = await updateJobPostProcessingFailed(supabase, job.id, result, ppMessage);

        // Post-processing failed but LLM succeeded -- delete pgmq message (no retry)
        await deleteMessage(supabase, msgId);

        if (!ppUpdated) {
          return { job_id: job.id, status: 'skipped', message: 'Job cancelled during processing' };
        }

        if (job.user_id) {
          notifyJobFailed(supabase, {
            jobId: job.id,
            userId: job.user_id,
            customerId: job.customer_id,
            featureSlug: job.feature_slug,
            errorMessage: ppMessage,
          }).catch((err) => console.error('Failed to send post-processing failure notification:', err));
        }

        return { job_id: job.id, status: 'post_processing_failed', message: ppMessage };
      }
    }

    // Update job as completed
    const completedUpdated = await updateJobCompleted(supabase, job.id, result);

    // Delete pgmq message -- job is done
    await deleteMessage(supabase, msgId);

    if (!completedUpdated) {
      return { job_id: job.id, status: 'skipped', message: 'Job cancelled during processing' };
    }

    if (job.user_id) {
      notifyJobCompleted(supabase, {
        jobId: job.id,
        userId: job.user_id,
        customerId: job.customer_id,
        featureSlug: job.feature_slug,
      }).catch((err) => console.error('Failed to send job completed notification:', err));
    }

    return { job_id: job.id, status: 'completed' };
  } catch (llmError) {
    const errorMessage = llmError instanceof Error ? llmError.message : 'Unknown LLM error';
    const isRetryable = llmError instanceof LLMError ? llmError.retryable : false;

    console.error(`LLM execution error for job ${job.id}:`, errorMessage);

    if (isRetryable && job.retry_count < provider.max_retries) {
      const retryUpdated = await updateJobForRetry(supabase, job.id, errorMessage, job.retry_count);
      if (!retryUpdated) {
        await deleteMessage(supabase, msgId);
        return { job_id: job.id, status: 'skipped', message: 'Job cancelled during processing' };
      }
      // Do NOT delete pgmq message -- VT will redeliver for retry
      return {
        job_id: job.id,
        status: 'retrying',
        message: `Scheduled for retry (${job.retry_count + 1}/${provider.max_retries})`,
      };
    } else {
      const failUpdated = await updateJobFailed(supabase, job.id, errorMessage);
      // Non-retryable or exhausted -- archive the message
      await archiveMessage(supabase, msgId);

      if (!failUpdated) {
        return { job_id: job.id, status: 'skipped', message: 'Job cancelled during processing' };
      }

      if (job.user_id) {
        notifyJobExhausted(supabase, {
          jobId: job.id,
          userId: job.user_id,
          customerId: job.customer_id,
          featureSlug: job.feature_slug,
          errorMessage,
        }).catch((err) => console.error('Failed to send job exhausted notification:', err));
      }

      return {
        job_id: job.id,
        status: 'exhausted',
        message: isRetryable ? 'Max retries exceeded' : 'Non-retryable error',
      };
    }
  }
}

// =============================================================================
// Provider Loading
// =============================================================================

/**
 * Gets provider configuration from database.
 */
async function getProvider(supabase: SupabaseClient, providerId: string): Promise<ProviderConfig> {
  const { data, error } = await supabase
    .from('llm_providers')
    .select('id, slug, name, timeout_seconds, max_retries, retry_delay_seconds, config')
    .eq('id', providerId)
    .single();

  if (error || !data) {
    throw new ApiError(`Provider ${providerId} not found`, 500);
  }

  return data;
}

// =============================================================================
// LLM Execution (Native SDKs)
// =============================================================================

/**
 * Builds LLMCallParams from an LLMJob record.
 */
function jobToCallParams(job: LLMJob): LLMCallParams {
  return {
    prompt: job.prompt,
    system_prompt: job.system_prompt,
    messages: job.messages,
    input: job.input,
  };
}

/**
 * Executes LLM call using native SDK based on provider.
 */
async function executeLLMCall(
  job: LLMJob,
  provider: ProviderConfig,
  llmProviders: LLMProviders,
  model: string,
): Promise<LLMResult> {
  const providerSlug = provider.slug as LLMProvider;
  const params = jobToCallParams(job);

  switch (providerSlug) {
    case 'openai':
      if (job.api_method === 'responses') {
        return callOpenAIResponses(job, provider, llmProviders, model);
      }
      return callOpenAIChat(params, provider, llmProviders, model);
    case 'anthropic':
      return sharedCallAnthropic(params, provider, llmProviders, model);
    case 'gemini':
      return sharedCallGemini(params, provider, llmProviders, model);
    default:
      throw new ApiError(`Unsupported provider: ${provider.slug}`, 400);
  }
}

/**
 * Submits an OpenAI job in background mode via the Responses API.
 */
async function submitOpenAIBackground(
  job: LLMJob,
  _provider: ProviderConfig,
  llmProviders: LLMProviders,
  model: string,
): Promise<{ responseId: string }> {
  const openai = llmProviders.openai();
  const safeParams = sanitizeInputParams(job.input);

  // Build input: prefer messages (multimodal), fall back to prompt (text-only)
  const input: unknown = job.messages || job.prompt;

  // deno-lint-ignore no-explicit-any
  const response = await withLogging('openai', 'responses.create(background)', model, async () => {
    return await openai.responses.create({
      model,
      input,
      background: true,
      metadata: { job_id: job.id },
      ...safeParams,
    // deno-lint-ignore no-explicit-any
    } as any);
  });

  return { responseId: response.id };
}

/**
 * Calls OpenAI Responses API.
 */
async function callOpenAIResponses(job: LLMJob, provider: ProviderConfig, llmProviders: LLMProviders, model: string): Promise<LLMResult> {
  const openai = llmProviders.openai();
  const safeParams = sanitizeInputParams(job.input);

  const response = await withLogging('openai', 'responses.create', model, async () => {
    return await openai.responses.create({
      model,
      input: job.prompt,
      ...safeParams,
    });
  });

  // deno-lint-ignore no-explicit-any
  const output = (response as any).output_text;
  if (!output) {
    throw new LLMError('No output_text in OpenAI Responses API response', 'INVALID_REQUEST', 'openai');
  }

  // deno-lint-ignore no-explicit-any
  const usage = (response as any).usage;

  return {
    output,
    usage: usage
      ? {
          prompt_tokens: usage.input_tokens,
          completion_tokens: usage.output_tokens,
          total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        }
      : undefined,
    model,
    // deno-lint-ignore no-explicit-any
    response_id: (response as any).id,
  };
}

// =============================================================================
// Job Status Updates
// =============================================================================

/**
 * Updates job to waiting_llm status after successful background submission.
 */
async function updateJobWaitingLLM(supabase: SupabaseClient, jobId: string, responseId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'waiting_llm',
      llm_response_id: responseId,
    })
    .eq('id', jobId)
    .eq('status', 'running')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Failed to update job to waiting_llm:', error);
    throw new ApiError('Failed to update job status', 500);
  }

  if (!data) {
    console.warn(`Job ${jobId} status guard: expected 'running' for waiting_llm transition (likely cancelled)`);
    return false;
  }

  return true;
}

/**
 * Updates job as completed with result.
 */
async function updateJobCompleted(supabase: SupabaseClient, jobId: string, result: LLMResult): Promise<boolean> {
  const { data, error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'completed',
      result_ref: JSON.stringify(result),
      llm_response_id: result.response_id || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'running')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Failed to update job as completed:', error);
    throw new ApiError('Failed to update job status', 500);
  }

  if (!data) {
    console.warn(`Job ${jobId} status guard: expected 'running' for completed transition (likely cancelled)`);
    return false;
  }

  return true;
}

/**
 * Updates job for retry with incremented count.
 */
async function updateJobForRetry(
  supabase: SupabaseClient,
  jobId: string,
  errorMessage: string,
  currentRetryCount: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'retrying',
      retry_count: currentRetryCount + 1,
      error_message: errorMessage,
    })
    .eq('id', jobId)
    .eq('status', 'running')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Failed to update job for retry:', error);
    throw new ApiError('Failed to update job status', 500);
  }

  if (!data) {
    console.warn(`Job ${jobId} status guard: expected 'running' for retrying transition (likely cancelled)`);
    return false;
  }

  return true;
}

/**
 * Updates job as post_processing_failed.
 */
async function updateJobPostProcessingFailed(
  supabase: SupabaseClient,
  jobId: string,
  result: LLMResult,
  errorMessage: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'post_processing_failed',
      result_ref: JSON.stringify(result),
      llm_response_id: result.response_id || null,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'running')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Failed to update job as post_processing_failed:', error);
    throw new ApiError('Failed to update job post-processing status', 500);
  }

  if (!data) {
    console.warn(`Job ${jobId} status guard: expected 'running' for post_processing_failed transition (likely cancelled)`);
    return false;
  }

  return true;
}

/**
 * Updates job as failed/exhausted.
 */
async function updateJobFailed(supabase: SupabaseClient, jobId: string, errorMessage: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'exhausted',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'running')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Failed to update job as failed:', error);
    return false;
  }

  if (!data) {
    console.warn(`Job ${jobId} status guard: expected 'running' for exhausted transition (likely cancelled)`);
    return false;
  }

  return true;
}
