/// <reference lib="deno.ns" />
/**
 * LLM Query Edge Function
 *
 * Entry point for all LLM requests. Supports both sync and async modes:
 *
 * SYNC MODE (default):
 *   - Calls LLM provider directly using native SDK
 *   - Waits for response
 *   - Returns result inline
 *   - Job record created for audit/monitoring
 *
 * ASYNC/BACKGROUND MODE (background=true):
 *   - Creates job with status 'queued'
 *   - Worker picks up and processes
 *   - Webhook delivers result
 *   - Use for long-running requests or when you need cancellation
 *   - Only supported by OpenAI
 *
 * Both modes:
 *   - Authenticate user
 *   - Validate request
 *   - Check rate limits
 *   - Create job record
 */

import { handleCors } from '../_shared/cors.ts';
import { authenticateRequestWithClient, type AuthResult } from '../_shared/auth.ts';
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts';
import { providers, LLMError, withLogging } from '../_shared/llm/index.ts';
import type { LLMProvider } from '../_shared/llm/index.ts';

// =============================================================================
// Types
// =============================================================================

/**
 * Request body for LLM query.
 */
interface LLMQueryRequest {
  /** The prompt text to send to the LLM */
  prompt: string;
  /** Provider slug (e.g., 'openai', 'anthropic', 'gemini'). Defaults to 'openai' */
  provider_slug?: string;
  /** Additional input parameters passed to the provider (model-specific options) */
  input?: Record<string, unknown>;
  /** Optional system prompt */
  system_prompt?: string;
  /** Feature identifier for analytics */
  feature_slug?: string;
  /** If true, use background/async mode (OpenAI only). Default: false */
  background?: boolean;
}

/**
 * Sync response - returned when background=false (default).
 */
interface LLMQuerySyncResponse {
  /** The created job ID for audit/reference */
  job_id: string;
  /** Job status */
  status: 'completed';
  /** The LLM result */
  result: {
    output: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    model?: string;
  };
  /** Rate limit info */
  rate_limit: {
    used: number;
    quota: number;
    remaining: number;
  };
}

/**
 * Async response - returned when background=true.
 */
interface LLMQueryAsyncResponse {
  /** The created job ID for status tracking */
  job_id: string;
  /** Job status */
  status: 'queued';
  /** Rate limit info */
  rate_limit: {
    used: number;
    quota: number;
    remaining: number;
  };
}

type LLMQueryResponse = LLMQuerySyncResponse | LLMQueryAsyncResponse;

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

/**
 * Provider configuration from database.
 */
interface Provider {
  id: string;
  slug: string;
  name: string;
  timeout_seconds: number;
  max_retries: number;
  retry_delay_seconds: number;
  config: Record<string, unknown>;
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
  /** Authentication function */
  authenticateRequest: (req: Request) => Promise<AuthResult>;
  /** LLM provider clients (optional, defaults to real SDKs) */
  llmProviders?: LLMProviders;
}

/**
 * Default dependencies using real implementations.
 */
const defaultDeps: HandlerDeps = {
  authenticateRequest: authenticateRequestWithClient,
  llmProviders: providers,
};

// =============================================================================
// Provider Capability Checks
// =============================================================================

/**
 * Checks if a provider supports background/async mode.
 * Only OpenAI supports this via their Batch/Responses API.
 */
function supportsBackgroundMode(providerSlug: string): boolean {
  return providerSlug === 'openai';
}

/**
 * Validates that provider slug is supported.
 */
function isValidProvider(slug: string): slug is LLMProvider {
  return ['openai', 'anthropic', 'gemini'].includes(slug);
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Create a handler with injectable dependencies (for testing).
 */
export function createHandler(deps: HandlerDeps = defaultDeps) {
  // Use provided LLM providers or fall back to defaults
  const llmProviders = deps.llmProviders || providers;

  return async function handler(req: Request): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
      // Only accept POST requests
      if (req.method !== 'POST') {
        throw new ApiError('Method not allowed', 405);
      }

      // 1. Authenticate and get user context with RLS-enforced client
      const { user, userClient } = await deps.authenticateRequest(req);

      // Verify user has a customer (required for LLM jobs)
      if (!user.customer_id) {
        throw new ApiError('User must belong to a customer to use LLM features', 403);
      }

      const customerId = user.customer_id;

      // 2. Parse and validate request
      const body: LLMQueryRequest = await req.json();
      validateRequest(body);

      // 3. Check if background mode is requested and supported
      const useBackgroundMode = body.background === true;
      const providerSlug = body.provider_slug || 'openai';

      if (!isValidProvider(providerSlug)) {
        throw new ApiError(`Unsupported provider: ${providerSlug}`, 400, 'INVALID_PROVIDER');
      }

      if (useBackgroundMode && !supportsBackgroundMode(providerSlug)) {
        throw new ApiError(
          `Provider '${providerSlug}' does not support background mode. Only OpenAI supports async/background requests.`,
          400,
          'BACKGROUND_NOT_SUPPORTED'
        );
      }

      // 4. Check and consume rate limit (atomic via SECURITY DEFINER function)
      const rateLimit = await checkAndConsumeRateLimit(customerId, userClient);

      // 5. Get provider configuration from database
      const provider = await getProvider(providerSlug, userClient);

      // 6. Create job record (for both sync and async, provides audit trail)
      const job = await createJob(
        {
          customer_id: customerId,
          user_id: user.user_id,
          provider_id: provider.id,
          prompt: body.prompt,
          input: body.input || {},
          system_prompt: body.system_prompt,
          feature_slug: body.feature_slug,
          status: useBackgroundMode ? 'queued' : 'running',
        },
        userClient
      );

      // 7. Handle sync vs async mode
      if (useBackgroundMode) {
        // ASYNC MODE: Return job_id, worker will process
        const response: LLMQueryAsyncResponse = {
          job_id: job.id,
          status: 'queued',
          rate_limit: {
            used: rateLimit.used,
            quota: rateLimit.quota,
            remaining: rateLimit.quota - rateLimit.used,
          },
        };
        return createSuccessResponse(response, 202); // 202 Accepted
      }

      // SYNC MODE: Call LLM directly using native SDK
      try {
        const result = await callProviderSync(providerSlug, provider, body, llmProviders);

        // Update job as completed
        await updateJobCompleted(userClient, job.id, result);

        // Return sync response with result
        const response: LLMQuerySyncResponse = {
          job_id: job.id,
          status: 'completed',
          result: {
            output: result.output,
            usage: result.usage,
            model: result.model,
          },
          rate_limit: {
            used: rateLimit.used,
            quota: rateLimit.quota,
            remaining: rateLimit.quota - rateLimit.used,
          },
        };
        return createSuccessResponse(response, 200);
      } catch (llmError) {
        // LLM call failed - update job status and re-throw
        const errorMessage = llmError instanceof Error ? llmError.message : 'Unknown LLM error';
        await updateJobFailed(userClient, job.id, errorMessage);
        throw llmError;
      }
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

// =============================================================================
// Provider Calls (Native SDK)
// =============================================================================

/**
 * Calls the LLM provider synchronously using native SDKs.
 * Dispatches to provider-specific implementation based on slug.
 */
async function callProviderSync(
  providerSlug: LLMProvider,
  provider: Provider,
  request: LLMQueryRequest,
  llmProviders: LLMProviders
): Promise<LLMResult> {
  switch (providerSlug) {
    case 'openai':
      return callOpenAI(provider, request, llmProviders);
    case 'anthropic':
      return callAnthropic(provider, request, llmProviders);
    case 'gemini':
      return callGemini(provider, request, llmProviders);
    default:
      throw new ApiError(`Unsupported provider: ${providerSlug}`, 400);
  }
}

/**
 * Calls OpenAI using native SDK.
 */
async function callOpenAI(
  provider: Provider,
  request: LLMQueryRequest,
  llmProviders: LLMProviders
): Promise<LLMResult> {
  const openai = llmProviders.openai();
  const model = (provider.config.model as string) || (provider.config.default_model as string) || 'gpt-4o';

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

  if (request.system_prompt) {
    messages.push({ role: 'system', content: request.system_prompt });
  }
  messages.push({ role: 'user', content: request.prompt });

  const response = await withLogging('openai', 'chat.completions.create', model, async () => {
    return await openai.chat.completions.create({
      model,
      messages,
      ...((request.input as Record<string, unknown>) || {}),
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
 * Calls Anthropic using native SDK.
 */
async function callAnthropic(
  provider: Provider,
  request: LLMQueryRequest,
  llmProviders: LLMProviders
): Promise<LLMResult> {
  const anthropic = llmProviders.anthropic();
  const model =
    (provider.config.model as string) || (provider.config.default_model as string) || 'claude-sonnet-4-20250514';
  const maxTokens = (provider.config.max_tokens as number) || 4096;

  const response = await withLogging('anthropic', 'messages.create', model, async () => {
    return await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: request.system_prompt || undefined,
      messages: [{ role: 'user', content: request.prompt }],
      ...((request.input as Record<string, unknown>) || {}),
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
async function callGemini(
  provider: Provider,
  request: LLMQueryRequest,
  llmProviders: LLMProviders
): Promise<LLMResult> {
  const gemini = llmProviders.gemini();
  const modelName = (provider.config.model as string) || (provider.config.default_model as string) || 'gemini-2.0-flash';

  const model = gemini.getGenerativeModel({ model: modelName });

  // Build prompt with system prompt if provided
  const fullPrompt = request.system_prompt ? `${request.system_prompt}\n\n${request.prompt}` : request.prompt;

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

/**
 * Main request handler - exported for direct testing without DI.
 */
export const handler = createHandler();

// Start the server - Supabase Edge Functions runtime requires this
Deno.serve(handler);

// =============================================================================
// Request Validation
// =============================================================================

/**
 * Validates the request body.
 * @throws ApiError if validation fails
 */
function validateRequest(body: LLMQueryRequest): void {
  if (!body.prompt || typeof body.prompt !== 'string') {
    throw new ApiError('prompt is required and must be a string', 400);
  }

  if (body.prompt.trim().length === 0) {
    throw new ApiError('prompt cannot be empty', 400);
  }

  if (body.prompt.length > 100000) {
    throw new ApiError('prompt exceeds maximum length of 100,000 characters', 400);
  }

  if (body.provider_slug && typeof body.provider_slug !== 'string') {
    throw new ApiError('provider_slug must be a string', 400);
  }

  if (body.input && typeof body.input !== 'object') {
    throw new ApiError('input must be an object', 400);
  }

  if (body.system_prompt && typeof body.system_prompt !== 'string') {
    throw new ApiError('system_prompt must be a string', 400);
  }

  if (body.feature_slug) {
    if (typeof body.feature_slug !== 'string') {
      throw new ApiError('feature_slug must be a string', 400);
    }
    if (body.feature_slug.length > 100) {
      throw new ApiError('feature_slug exceeds maximum length of 100 characters', 400);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(body.feature_slug)) {
      throw new ApiError('feature_slug may only contain letters, numbers, hyphens, and underscores', 400);
    }
  }

  if (body.background !== undefined && typeof body.background !== 'boolean') {
    throw new ApiError('background must be a boolean', 400);
  }
}

// =============================================================================
// Rate Limiting
// =============================================================================

interface RateLimitResult {
  used: number;
  quota: number;
}

/**
 * Checks and consumes rate limit atomically.
 * Uses SECURITY DEFINER function for controlled privilege escalation.
 */
async function checkAndConsumeRateLimit(customerId: string, supabase: SupabaseClient): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc('llm_increment_rate_limit', {
    p_customer_id: customerId,
    p_period: 'monthly',
    p_default_quota: 1000,
  });

  if (error) {
    console.error('Rate limit check error:', error);
    throw new ApiError('Failed to check rate limit', 500);
  }

  if (!data) {
    const { data: limitCheck } = await supabase.rpc('llm_check_rate_limit', {
      p_customer_id: customerId,
      p_period: 'monthly',
    });

    const limit = limitCheck?.[0];
    throw new ApiError(
      `Rate limit exceeded. Used ${limit?.used ?? '?'}/${limit?.quota ?? '?'} requests this month.${limit?.reset_at ? ` Resets at ${limit.reset_at}` : ''}`,
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  return {
    used: data.used,
    quota: data.quota,
  };
}

// =============================================================================
// Provider Configuration
// =============================================================================

/**
 * Gets provider configuration from database.
 */
async function getProvider(slug: string, supabase: SupabaseClient): Promise<Provider> {
  const { data, error } = await supabase
    .from('llm_providers')
    .select('id, slug, name, timeout_seconds, max_retries, retry_delay_seconds, config')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new ApiError(`Provider '${slug}' not found or inactive`, 400, 'INVALID_PROVIDER');
  }

  return data;
}

// =============================================================================
// Job Management
// =============================================================================

interface CreateJobInput {
  customer_id: string;
  user_id: string;
  provider_id: string;
  prompt: string;
  input: Record<string, unknown>;
  system_prompt?: string;
  feature_slug?: string;
  status: 'queued' | 'running';
}

interface Job {
  id: string;
  status: string;
}

/**
 * Creates a job record for tracking.
 */
async function createJob(input: CreateJobInput, supabase: SupabaseClient): Promise<Job> {
  const { data, error } = await supabase
    .from('llm_jobs')
    .insert({
      customer_id: input.customer_id,
      user_id: input.user_id,
      provider_id: input.provider_id,
      prompt: input.prompt,
      input: input.input,
      system_prompt: input.system_prompt,
      feature_slug: input.feature_slug,
      status: input.status,
      started_at: input.status === 'running' ? new Date().toISOString() : null,
    })
    .select('id, status')
    .single();

  if (error) {
    console.error('Failed to create job:', error);
    throw new ApiError('Failed to create LLM job', 500);
  }

  return data;
}

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
    // Don't throw - the LLM call succeeded, we just failed to record it
  }
}

/**
 * Updates job as failed with error message.
 */
async function updateJobFailed(supabase: SupabaseClient, jobId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'error',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('Failed to update job as failed:', error);
    // Don't throw - we're already handling an error
  }
}
