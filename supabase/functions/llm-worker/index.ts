/// <reference lib="deno.ns" />
/**
 * LLM Worker Edge Function
 *
 * Processes queued LLM jobs (async mode). This function:
 * 1. Claims a job atomically (guarded UPDATE to prevent race conditions)
 * 2. Loads provider configuration
 * 3. Calls the appropriate LLM provider using native SDK
 * 4. Updates job with result or error
 *
 * This worker is designed to be invoked by:
 * - Supabase scheduled function (pg_cron trigger)
 * - Direct invocation for immediate processing
 *
 * @see llm-query for the entry point that creates jobs
 * @see llm-webhook for webhook handling (OpenAI async responses)
 */

import { handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts';
import { providers, LLMError, withLogging } from '../_shared/llm/index.ts';
import type { LLMProvider } from '../_shared/llm/index.ts';
import {
  notifyJobStarted,
  notifyJobCompleted,
  notifyJobFailed,
  notifyJobExhausted,
} from '../_shared/llm-notifications.ts';
import { getResponseProcessor as getResponseProcessorDefault } from '../_shared/response-processors/index.ts';
import type { ResponseProcessor } from '../_shared/response-processors/index.ts';

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
}

/**
 * Provider configuration from database.
 */
interface ProviderConfig {
  id: string;
  slug: string;
  name: string;
  timeout_seconds: number;
  max_retries: number;
  retry_delay_seconds: number;
  config: Record<string, unknown>;
}

/**
 * Worker response returned to caller.
 */
interface WorkerResponse {
  processed: boolean;
  job_id?: string;
  status?: string;
  message?: string;
}

/**
 * Internal result type for LLM calls.
 */
interface LLMResult {
  output: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
  response_id?: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

/**
 * LLM provider clients interface for dependency injection.
 */
export interface LLMProviders {
  /** OpenAI SDK client factory */
  openai: () => ReturnType<typeof providers.openai>;
  /** Anthropic SDK client factory */
  anthropic: () => ReturnType<typeof providers.anthropic>;
  /** Gemini SDK client factory */
  gemini: () => ReturnType<typeof providers.gemini>;
}

/**
 * Dependencies that can be injected for testing.
 */
export interface HandlerDeps {
  /** Supabase service client factory */
  createServiceClient: () => SupabaseClient;
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

    try {
      const supabase = deps.createServiceClient();

      // 1. Claim a job atomically using guarded dequeue pattern
      const job = await claimJob(supabase);

      if (!job) {
        // No jobs available - this is normal
        const response: WorkerResponse = {
          processed: false,
          message: 'No jobs to process',
        };
        return createSuccessResponse(response);
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

      // 2. Load provider configuration
      const provider = await getProvider(supabase, job.provider_id);

      // Validate provider slug
      if (!isValidProvider(provider.slug)) {
        await updateJobFailed(supabase, job.id, `Unsupported provider: ${provider.slug}`);
        const response: WorkerResponse = {
          processed: true,
          job_id: job.id,
          status: 'failed',
          message: `Unsupported provider: ${provider.slug}`,
        };
        return createSuccessResponse(response);
      }

      // 3. Execute LLM call using native SDK
      try {
        const result = await executeLLMCall(job, provider, llmProviders);

        // 4. Run response processor if registered for this feature
        const processor = resolveProcessor(job.feature_slug);
        if (processor) {
          try {
            // Enforce context.customer_id matches job.customer_id to prevent cross-tenant writes
            const safeContext = { ...job.context, customer_id: job.customer_id };
            await processor(supabase, result.output, safeContext);
          } catch (ppError) {
            const ppMessage = ppError instanceof Error ? ppError.message : 'Post-processing failed';
            console.error(`Post-processing failed for job ${job.id}:`, ppMessage);
            await updateJobPostProcessingFailed(supabase, job.id, result, ppMessage);

            // Notify user of failure (non-blocking)
            if (job.user_id) {
              notifyJobFailed(supabase, {
                jobId: job.id,
                userId: job.user_id,
                customerId: job.customer_id,
                featureSlug: job.feature_slug,
                errorMessage: ppMessage,
              }).catch((err) => console.error('Failed to send post-processing failure notification:', err));
            }

            const response: WorkerResponse = {
              processed: true,
              job_id: job.id,
              status: 'post_processing_failed',
              message: ppMessage,
            };
            return createSuccessResponse(response);
          }
        }

        // 5. Update job as completed
        await updateJobCompleted(supabase, job.id, result);

        // Notify job completed (non-blocking)
        if (job.user_id) {
          notifyJobCompleted(supabase, {
            jobId: job.id,
            userId: job.user_id,
            customerId: job.customer_id,
            featureSlug: job.feature_slug,
          }).catch((err) => console.error('Failed to send job completed notification:', err));
        }

        const response: WorkerResponse = {
          processed: true,
          job_id: job.id,
          status: 'completed',
        };
        return createSuccessResponse(response);
      } catch (llmError) {
        // Handle LLM execution error
        const errorMessage = llmError instanceof Error ? llmError.message : 'Unknown LLM error';
        const isRetryable = llmError instanceof LLMError ? llmError.retryable : false;

        console.error(`LLM execution error for job ${job.id}:`, errorMessage);

        // Check if we should retry (only for retryable errors)
        if (isRetryable && job.retry_count < provider.max_retries) {
          await updateJobForRetry(supabase, job.id, errorMessage, job.retry_count);
          const response: WorkerResponse = {
            processed: true,
            job_id: job.id,
            status: 'retrying',
            message: `Scheduled for retry (${job.retry_count + 1}/${provider.max_retries})`,
          };
          return createSuccessResponse(response);
        } else {
          await updateJobFailed(supabase, job.id, errorMessage);

          // Notify job exhausted (non-blocking)
          if (job.user_id) {
            notifyJobExhausted(supabase, {
              jobId: job.id,
              userId: job.user_id,
              customerId: job.customer_id,
              featureSlug: job.feature_slug,
              errorMessage: errorMessage,
            }).catch((err) => console.error('Failed to send job exhausted notification:', err));
          }

          const response: WorkerResponse = {
            processed: true,
            job_id: job.id,
            status: 'exhausted',
            message: isRetryable ? 'Max retries exceeded' : 'Non-retryable error',
          };
          return createSuccessResponse(response);
        }
      }
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
// Provider Validation
// =============================================================================

/**
 * Validates that provider slug is supported.
 */
function isValidProvider(slug: string): slug is LLMProvider {
  return ['openai', 'anthropic', 'gemini'].includes(slug);
}

// =============================================================================
// Job Claiming (Guarded Dequeue Pattern)
// =============================================================================

/**
 * Claims a job atomically using guarded dequeue pattern.
 * Prevents race conditions where multiple workers claim the same job.
 */
async function claimJob(supabase: SupabaseClient): Promise<LLMJob | null> {
  // Atomic claim: UPDATE with WHERE status IN ('queued', 'retrying')
  // ORDER BY created_at ensures FIFO processing
  const { data, error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .in('status', ['queued', 'retrying'])
    .order('created_at', { ascending: true })
    .limit(1)
    .select(
      'id, customer_id, user_id, provider_id, prompt, input, system_prompt, feature_slug, status, retry_count, created_at, messages, context, api_method'
    )
    .maybeSingle();

  if (error) {
    console.error('Error claiming job:', error);
    throw new ApiError('Failed to claim job', 500);
  }

  return data;
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
 * Executes LLM call using native SDK based on provider.
 * Supports two OpenAI API paths via job.api_method:
 *   - 'chat' (default): Chat Completions API, with optional multimodal messages
 *   - 'responses': Responses API (for tools like web_search)
 */
async function executeLLMCall(
  job: LLMJob,
  provider: ProviderConfig,
  llmProviders: LLMProviders
): Promise<LLMResult> {
  const providerSlug = provider.slug as LLMProvider;

  switch (providerSlug) {
    case 'openai':
      if (job.api_method === 'responses') {
        return callOpenAIResponses(job, provider, llmProviders);
      }
      return callOpenAIChat(job, provider, llmProviders);
    case 'anthropic':
      return callAnthropic(job, provider, llmProviders);
    case 'gemini':
      return callGemini(job, provider, llmProviders);
    default:
      throw new ApiError(`Unsupported provider: ${provider.slug}`, 400);
  }
}

/**
 * Strips protected keys from job.input before spreading onto API calls.
 * Prevents users from overriding critical parameters like model, messages, or input.
 */
const PROTECTED_INPUT_KEYS = new Set([
  'model', 'messages', 'input', 'stream',
]);

function sanitizeInputParams(input: unknown): Record<string, unknown> {
  const raw = (input as Record<string, unknown>) || {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!PROTECTED_INPUT_KEYS.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Calls OpenAI Chat Completions API.
 * If job.messages is set, uses it directly (supports multimodal content parts).
 * Otherwise constructs messages from prompt/system_prompt (existing behavior).
 */
async function callOpenAIChat(job: LLMJob, provider: ProviderConfig, llmProviders: LLMProviders): Promise<LLMResult> {
  const openai = llmProviders.openai();
  const model = (provider.config.model as string) || (provider.config.default_model as string) || 'gpt-4o';

  // Use pre-built messages if available (multimodal), else construct from prompt
  // deno-lint-ignore no-explicit-any
  let messages: any[];
  if (job.messages) {
    messages = job.messages;
  } else {
    messages = [];
    if (job.system_prompt) {
      messages.push({ role: 'system', content: job.system_prompt });
    }
    messages.push({ role: 'user', content: job.prompt });
  }

  const response = await withLogging('openai', 'chat.completions.create', model, async () => {
    return await openai.chat.completions.create({
      model,
      messages,
      ...sanitizeInputParams(job.input),
    });
  });

  const choice = response.choices[0];
  if (!choice?.message?.content) {
    throw new LLMError('No content in OpenAI response', 'INVALID_REQUEST', 'openai');
  }

  return {
    output: choice.message.content,
    usage: response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined,
    model: response.model,
    response_id: response.id,
  };
}

/**
 * Calls OpenAI Responses API.
 * Used for features that need tools (e.g. web_search for logos).
 * job.input is spread onto the API call (tools, text format, model override, etc.)
 */
async function callOpenAIResponses(job: LLMJob, provider: ProviderConfig, llmProviders: LLMProviders): Promise<LLMResult> {
  const openai = llmProviders.openai();
  const safeParams = sanitizeInputParams(job.input);
  const model = (provider.config.model as string) || (provider.config.default_model as string) || 'gpt-4o';

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

/**
 * Calls Anthropic using native SDK.
 */
async function callAnthropic(job: LLMJob, provider: ProviderConfig, llmProviders: LLMProviders): Promise<LLMResult> {
  const anthropic = llmProviders.anthropic();
  const model =
    (provider.config.model as string) || (provider.config.default_model as string) || 'claude-sonnet-4-20250514';
  const maxTokens = (provider.config.max_tokens as number) || 4096;

  const response = await withLogging('anthropic', 'messages.create', model, async () => {
    return await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: job.system_prompt || undefined,
      messages: [{ role: 'user', content: job.prompt }],
      ...((job.input as Record<string, unknown>) || {}),
    });
  });

  const textContent = response.content.find((c: { type: string }) => c.type === 'text') as
    | { type: 'text'; text: string }
    | undefined;

  if (!textContent) {
    throw new LLMError('No text content in Anthropic response', 'INVALID_REQUEST', 'anthropic');
  }

  return {
    output: textContent.text,
    usage: {
      prompt_tokens: response.usage?.input_tokens,
      completion_tokens: response.usage?.output_tokens,
      total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    },
    model: response.model,
    response_id: response.id,
  };
}

/**
 * Calls Gemini using native SDK.
 */
async function callGemini(job: LLMJob, provider: ProviderConfig, llmProviders: LLMProviders): Promise<LLMResult> {
  const gemini = llmProviders.gemini();
  const modelName = (provider.config.model as string) || (provider.config.default_model as string) || 'gemini-2.0-flash';

  const model = gemini.getGenerativeModel({ model: modelName });

  // Build prompt with system prompt if provided
  const fullPrompt = job.system_prompt ? `${job.system_prompt}\n\n${job.prompt}` : job.prompt;

  const result = await withLogging('gemini', 'generateContent', modelName, async () => {
    return await model.generateContent(fullPrompt);
  });

  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new LLMError('No text in Gemini response', 'INVALID_REQUEST', 'gemini');
  }

  return {
    output: text,
    usage: response.usageMetadata
      ? {
          prompt_tokens: response.usageMetadata.promptTokenCount,
          completion_tokens: response.usageMetadata.candidatesTokenCount,
          total_tokens: response.usageMetadata.totalTokenCount,
        }
      : undefined,
    model: modelName,
  };
}

// =============================================================================
// Job Status Updates
// =============================================================================

/**
 * Updates job as completed with result.
 */
async function updateJobCompleted(supabase: SupabaseClient, jobId: string, result: LLMResult): Promise<void> {
  const { error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'completed',
      result_ref: JSON.stringify(result),
      llm_response_id: result.response_id || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('Failed to update job as completed:', error);
    throw new ApiError('Failed to update job status', 500);
  }
}

/**
 * Updates job for retry with incremented count.
 */
async function updateJobForRetry(
  supabase: SupabaseClient,
  jobId: string,
  errorMessage: string,
  currentRetryCount: number
): Promise<void> {
  const { error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'retrying',
      retry_count: currentRetryCount + 1,
      error_message: errorMessage,
    })
    .eq('id', jobId);

  if (error) {
    console.error('Failed to update job for retry:', error);
    throw new ApiError('Failed to update job status', 500);
  }
}

/**
 * Updates job as post_processing_failed.
 * LLM call succeeded but the response processor threw an error.
 * Raw LLM output is preserved in result_ref so no tokens are wasted on retry.
 */
async function updateJobPostProcessingFailed(
  supabase: SupabaseClient,
  jobId: string,
  result: LLMResult,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'post_processing_failed',
      result_ref: JSON.stringify(result),
      llm_response_id: result.response_id || null,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('Failed to update job as post_processing_failed:', error);
    throw new ApiError('Failed to update job post-processing status', 500);
  }
}

/**
 * Updates job as failed/exhausted.
 */
async function updateJobFailed(supabase: SupabaseClient, jobId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'exhausted',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('Failed to update job as failed:', error);
  }
}
