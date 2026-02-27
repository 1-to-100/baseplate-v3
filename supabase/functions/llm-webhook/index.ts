/// <reference lib="deno.ns" />
/**
 * LLM Webhook Edge Function
 *
 * Receives webhooks from LLM providers (OpenAI, Anthropic, Gemini) and updates
 * job status accordingly. This function:
 * 1. Validates webhook authenticity (signature verification)
 * 2. Checks idempotency (prevents duplicate processing)
 * 3. Updates job with result or error
 *
 * IMPORTANT: Always returns 200 OK to acknowledge receipt, even on errors.
 * This prevents providers from retrying indefinitely.
 */

import { createServiceClient } from '../_shared/supabase.ts'
import { providers } from '../_shared/llm/index.ts'
import {
  notifyJobCompleted,
  notifyJobFailed,
  notifyJobExhausted,
} from '../_shared/llm-notifications.ts'
import { getResponseProcessor as getResponseProcessorDefault } from '../_shared/response-processors/index.ts'
import type { ResponseProcessor } from '../_shared/response-processors/index.ts'
import { secureCompare } from '../_shared/crypto.ts'

// =============================================================================
// Types
// =============================================================================

interface WebhookPayload {
  id: string
  type: string
  object?: string
  status?: string
  output?: unknown[]
  error?: {
    message: string
    code?: string
  }
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
  model?: string
  metadata?: {
    job_id?: string
    [key: string]: unknown
  }
  // Anthropic-specific fields
  content?: Array<{ type: string; text?: string }>
  stop_reason?: string
}

interface DiagnosticLogInput {
  event_type: string
  job_id?: string
  provider_slug?: string
  customer_id?: string
  error_code?: string
  error_message?: string
  job_status_at_receipt?: string
  expected_response_id?: string
  received_response_id?: string
  response_payload?: unknown
}

import type { SupabaseClient } from '../_shared/supabase.ts'

/**
 * LLM provider clients interface for dependency injection.
 */
export interface LLMProviders {
  openai: () => ReturnType<typeof providers.openai>
  anthropic: () => ReturnType<typeof providers.anthropic>
  gemini: () => ReturnType<typeof providers.gemini>
}

/**
 * Dependencies that can be injected for testing
 */
export interface HandlerDeps {
  createServiceClient: () => SupabaseClient
  getEnv: (key: string) => string | undefined
  llmProviders?: LLMProviders
  getResponseProcessor?: (slug: string | null | undefined) => ResponseProcessor | null
}

/**
 * Default dependencies using real implementations
 */
const defaultDeps: HandlerDeps = {
  createServiceClient,
  getEnv: (key: string) => Deno.env.get(key),
  llmProviders: providers,
}

// =============================================================================
// Diagnostic Logging Helper
// =============================================================================

/**
 * Strip sensitive content (LLM output text) from webhook payloads before
 * writing to the diagnostic log table. Keeps IDs, types, status, errors,
 * and usage metadata that are useful for debugging without storing
 * potentially sensitive response content.
 */
function sanitizePayloadForDiagnostics(payload: WebhookPayload): Record<string, unknown> {
  return {
    id: payload.id,
    type: payload.type,
    object: payload.object,
    status: payload.status,
    model: payload.model,
    usage: payload.usage,
    error: payload.error,
    metadata: payload.metadata,
    // Deliberately omit: output, content (may contain sensitive LLM response text)
  }
}

async function logDiagnostic(
  supabase: SupabaseClient,
  input: DiagnosticLogInput
): Promise<void> {
  try {
    await supabase.rpc('llm_log_diagnostic', {
      p_event_type: input.event_type,
      p_job_id: input.job_id || null,
      p_provider_slug: input.provider_slug || null,
      p_customer_id: input.customer_id || null,
      p_error_code: input.error_code || null,
      p_error_message: input.error_message || null,
      p_job_status_at_receipt: input.job_status_at_receipt || null,
      p_expected_response_id: input.expected_response_id || null,
      p_received_response_id: input.received_response_id || null,
      p_response_payload: input.response_payload || null,
    })
  } catch (error) {
    // Don't fail the webhook if diagnostic logging fails
    console.error('Failed to log diagnostic:', error)
  }
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Create a handler with injectable dependencies (for testing)
 */
export function createHandler(deps: HandlerDeps = defaultDeps) {
  const llmProviders = deps.llmProviders || providers
  const resolveProcessor = deps.getResponseProcessor || getResponseProcessorDefault

  return async function handler(req: Request): Promise<Response> {
    // Always return 200 to acknowledge webhook receipt
    const ack = () => new Response('OK', { status: 200 })

    try {
      const supabase = deps.createServiceClient()

      // Provider must be specified via ?provider= query parameter
      const url = new URL(req.url)
      const providerSlug = url.searchParams.get('provider')?.trim() ?? null

      // H2: DLQ replay — re-process stored webhook payload with service role auth
      if (url.searchParams.get('source') === 'dlq') {
        return await handleDLQReplay(req, supabase, deps, llmProviders, resolveProcessor)
      }

      if (!providerSlug) {
        console.error('Missing required ?provider= query parameter')
        return ack()
      }

      // Get raw body for signature verification
      const rawBody = await req.text()

      // OpenAI uses Standard Webhooks — handle separately with SDK verification
      if (providerSlug === 'openai') {
        return await handleOpenAIWebhook(req, rawBody, supabase, deps, llmProviders, resolveProcessor)
      }

      // Validate webhook signature (Anthropic, Gemini)
      const isValid = await validateWebhookSignature(req, rawBody, providerSlug, deps)
      if (!isValid) {
        console.error(`Invalid webhook signature for provider: ${providerSlug}`)
        await logDiagnostic(supabase, {
          event_type: 'signature_invalid',
          provider_slug: providerSlug,
          error_message: 'Webhook signature validation failed',
        })
        return ack()
      }

      // Parse payload
      let payload: WebhookPayload
      try {
        payload = JSON.parse(rawBody)
      } catch {
        console.error('Invalid JSON in webhook payload')
        return ack()
      }

      console.log(`Received ${providerSlug} webhook: ${payload.type || payload.object || 'unknown'}`)

      // Extract job ID from payload
      const jobId = extractJobId(payload, providerSlug)
      if (!jobId) {
        console.error('No job_id in webhook payload metadata')
        return ack()
      }

      // Guard: Check job status for various edge cases
      const { data: jobCheck } = await supabase
        .from('llm_jobs')
        .select('status, customer_id, user_id, feature_slug, llm_response_id')
        .eq('id', jobId)
        .single()

      // Guard 1: Job not found
      if (!jobCheck) {
        console.log(`Job not found: ${jobId}`)
        await logDiagnostic(supabase, {
          event_type: 'unknown_job',
          job_id: jobId,
          provider_slug: providerSlug,
          error_message: 'Webhook received for non-existent job',
          response_payload: sanitizePayloadForDiagnostics(payload),
        })
        return ack()
      }

      // Guard 2: Job was cancelled
      if (jobCheck.status === 'cancelled') {
        console.log(`Ignoring webhook for cancelled job: ${jobId}`)
        await logDiagnostic(supabase, {
          event_type: 'cancelled_job_response',
          job_id: jobId,
          provider_slug: providerSlug,
          customer_id: jobCheck.customer_id,
          job_status_at_receipt: jobCheck.status,
          response_payload: sanitizePayloadForDiagnostics(payload),
        })
        return ack()
      }

      // Guard 3: Job already in terminal state
      const terminalStates = ['completed', 'error', 'exhausted', 'post_processing_failed']
      if (terminalStates.includes(jobCheck.status)) {
        const isErrorResponse = payload.error !== undefined || payload.status === 'failed'
        const eventType = isErrorResponse ? 'late_failure_response' : 'late_success_ignored'
        console.log(`Ignoring webhook for terminal job ${jobId} (status: ${jobCheck.status})`)
        await logDiagnostic(supabase, {
          event_type: eventType,
          job_id: jobId,
          provider_slug: providerSlug,
          customer_id: jobCheck.customer_id,
          job_status_at_receipt: jobCheck.status,
          error_code: payload.error?.code,
          error_message: payload.error?.message,
          response_payload: sanitizePayloadForDiagnostics(payload),
        })
        return ack()
      }

      // Guard 4: Response ID mismatch (stale response)
      if (jobCheck.llm_response_id && jobCheck.llm_response_id !== payload.id) {
        console.log(`Stale response for job ${jobId}: expected ${jobCheck.llm_response_id}, got ${payload.id}`)
        await logDiagnostic(supabase, {
          event_type: 'stale_response',
          job_id: jobId,
          provider_slug: providerSlug,
          customer_id: jobCheck.customer_id,
          job_status_at_receipt: jobCheck.status,
          expected_response_id: jobCheck.llm_response_id,
          received_response_id: payload.id,
          response_payload: sanitizePayloadForDiagnostics(payload),
        })
        return ack()
      }

      // Extract webhook ID for idempotency
      const webhookId = payload.id
      if (!webhookId) {
        console.error('No webhook ID in payload')
        return ack()
      }

      // Check idempotency - prevent duplicate processing
      const { data: isNewWebhook } = await supabase.rpc('llm_record_webhook', {
        p_webhook_id: webhookId,
        p_job_id: jobId,
        p_provider_slug: providerSlug,
        p_event_type: payload.type || payload.object,
      })

      // Guard 5: Duplicate webhook (idempotency)
      if (!isNewWebhook) {
        console.log(`Duplicate webhook ${webhookId} - already processed`)
        await logDiagnostic(supabase, {
          event_type: 'duplicate_webhook',
          job_id: jobId,
          provider_slug: providerSlug,
          customer_id: jobCheck.customer_id,
          received_response_id: webhookId,
          error_message: 'Webhook already processed (idempotency check)',
        })
        return ack()
      }

      // Process webhook based on provider and type
      try {
        await processWebhook(supabase, payload, providerSlug, jobId, {
          customerId: jobCheck.customer_id,
          userId: jobCheck.user_id,
          featureSlug: jobCheck.feature_slug,
        })
      } catch (processingError) {
        // Log diagnostic and add to Dead Letter Queue for retry
        const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown processing error'
        console.error(`Webhook processing failed for job ${jobId}, adding to DLQ:`, errorMessage)

        await logDiagnostic(supabase, {
          event_type: 'processing_error',
          job_id: jobId,
          provider_slug: providerSlug,
          customer_id: jobCheck.customer_id,
          error_code: 'PROCESSING_FAILED',
          error_message: errorMessage,
          job_status_at_receipt: jobCheck.status,
          response_payload: sanitizePayloadForDiagnostics(payload),
        })

        await supabase.rpc('llm_add_to_dlq', {
          p_job_id: jobId,
          p_webhook_payload: payload,
          p_error_message: errorMessage,
          p_provider_slug: providerSlug,
          p_error_code: 'PROCESSING_FAILED',
        })
      }

      return ack()
    } catch (error) {
      console.error('Webhook processing error:', error)
      return ack() // Always acknowledge to prevent retries
    }
  }
}

/**
 * Main request handler - exported for direct testing without DI
 */
export const handler = createHandler()

// Start the server - Supabase Edge Functions runtime requires this
Deno.serve(handler)

// =============================================================================
// Signature Validation
// =============================================================================


// OpenAI uses Standard Webhooks SDK (handleOpenAIWebhook) — no case here.
async function validateWebhookSignature(
  req: Request,
  rawBody: string,
  provider: string,
  deps: HandlerDeps
): Promise<boolean> {
  switch (provider) {
    case 'anthropic':
      return validateAnthropicSignature(req, rawBody, deps)
    case 'gemini':
      return await validateGeminiSignature(req, rawBody, deps)
    default:
      return false
  }
}

async function validateAnthropicSignature(req: Request, rawBody: string, deps: HandlerDeps): Promise<boolean> {
  const signature = req.headers.get('anthropic-signature')
  const webhookSecret = deps.getEnv('ANTHROPIC_WEBHOOK_SECRET')

  if (!webhookSecret) {
    console.error('ANTHROPIC_WEBHOOK_SECRET not configured - rejecting webhook')
    return false
  }

  if (!signature) {
    return false
  }

  // Anthropic uses similar HMAC-SHA256 pattern
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Use constant-time comparison to prevent timing attacks
  return await secureCompare(signature, expectedSignature)
}

async function validateGeminiSignature(req: Request, rawBody: string, deps: HandlerDeps): Promise<boolean> {
  const signature = req.headers.get('x-goog-signature')
  const webhookSecret = deps.getEnv('GOOGLE_WEBHOOK_SECRET')

  if (!webhookSecret) {
    console.error('GOOGLE_WEBHOOK_SECRET not configured - rejecting webhook')
    return false
  }

  if (!signature) {
    return false
  }

  // Google uses HMAC-SHA256 for webhook verification
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Use constant-time comparison to prevent timing attacks
  return await secureCompare(signature, expectedSignature)
}

// =============================================================================
// Job ID Extraction
// =============================================================================

export function extractJobId(payload: WebhookPayload, provider: string): string | null {
  // Check metadata first (standard location)
  if (payload.metadata?.job_id) {
    return payload.metadata.job_id
  }

  // Provider-specific fallbacks (OpenAI uses handleOpenAIWebhook with response ID lookup)
  switch (provider) {
    case 'anthropic':
      return (payload as unknown as { custom_id?: string })?.custom_id || null
    default:
      return null
  }
}

// =============================================================================
// Webhook Processing
// =============================================================================

interface JobContext {
  customerId: string
  userId: string | null
  featureSlug: string | null
}

async function processWebhook(
  supabase: SupabaseClient,
  payload: WebhookPayload,
  provider: string,
  jobId: string,
  jobContext: JobContext
): Promise<void> {
  const eventType = payload.type || payload.object || ''

  // Determine if this is a success or error response
  const isError =
    eventType.includes('error') ||
    eventType.includes('failed') ||
    payload.status === 'failed' ||
    payload.error !== undefined

  if (isError) {
    await handleErrorResponse(supabase, jobId, payload, jobContext)
  } else if (
    eventType.includes('completed') ||
    eventType.includes('done') ||
    payload.status === 'completed'
  ) {
    await handleSuccessResponse(supabase, jobId, payload, provider, jobContext)
  } else {
    // Log unknown event types for debugging
    console.log(`Unhandled webhook event type: ${eventType}`)
  }
}

async function handleSuccessResponse(
  supabase: SupabaseClient,
  jobId: string,
  payload: WebhookPayload,
  provider: string,
  jobContext: JobContext
): Promise<void> {
  // Extract output text based on provider
  let outputText = ''

  switch (provider) {
    case 'openai': {
      // OpenAI Responses API format
      const output = payload.output || []
      const messageItem = output.find((item: unknown) => (item as { type: string }).type === 'message')
      if (messageItem) {
        const content = (messageItem as { content?: Array<{ type: string; text?: string }> }).content || []
        const textItem = content.find((c) => c.type === 'output_text')
        outputText = textItem?.text || ''
      }
      break
    }
    case 'anthropic': {
      // Anthropic Messages API format
      const textContent = payload.content?.find((c) => c.type === 'text')
      outputText = textContent?.text || ''
      break
    }
    case 'gemini': {
      // Gemini format
      const candidates = (payload as unknown as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates
      outputText = candidates?.[0]?.content?.parts?.[0]?.text || ''
      break
    }
  }

  const result = {
    output: outputText,
    usage: payload.usage,
    model: payload.model,
    response_id: payload.id,
  }

  const { error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'completed',
      result_ref: JSON.stringify(result),
      llm_response_id: payload.id,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'waiting_llm') // Guard: only update if still waiting

  if (error) {
    console.error(`Failed to update job ${jobId} as completed:`, error)
  } else {
    console.log(`Job ${jobId} completed successfully`)

    // Notify job completed (non-blocking)
    if (jobContext.userId) {
      notifyJobCompleted(supabase, {
        jobId,
        userId: jobContext.userId,
        customerId: jobContext.customerId,
        featureSlug: jobContext.featureSlug,
      }).catch((err) => console.error('Failed to send job completed notification:', err))
    }
  }
}

async function handleErrorResponse(
  supabase: SupabaseClient,
  jobId: string,
  payload: WebhookPayload,
  jobContext: JobContext
): Promise<void> {
  const errorMessage = payload.error?.message || 'Unknown error from LLM provider'

  // Check current job state to determine next action
  const { data: job } = await supabase
    .from('llm_jobs')
    .select('retry_count, provider_id')
    .eq('id', jobId)
    .single()

  if (!job) {
    console.error(`Job ${jobId} not found`)
    return
  }

  // Get provider config for max retries
  const { data: provider } = await supabase
    .from('llm_providers')
    .select('max_retries')
    .eq('id', job.provider_id)
    .single()

  const maxRetries = provider?.max_retries || 1

  if (job.retry_count < maxRetries) {
    // Schedule for retry — update status and re-enqueue to pgmq for worker pickup
    const { error } = await supabase
      .from('llm_jobs')
      .update({
        status: 'retrying',
        retry_count: job.retry_count + 1,
        error_message: errorMessage,
      })
      .eq('id', jobId)
      .eq('status', 'waiting_llm')

    if (error) {
      console.error(`Failed to update job ${jobId} for retry:`, error)
    } else {
      // Re-enqueue to pgmq so the worker picks it up again
      const { error: enqueueError } = await supabase.rpc('llm_enqueue_job', {
        p_job_id: jobId,
      })
      if (enqueueError) {
        console.error(`Failed to re-enqueue job ${jobId} for retry:`, enqueueError)
      }
      console.log(`Job ${jobId} scheduled for retry (${job.retry_count + 1}/${maxRetries})`)
    }
  } else {
    // Max retries exceeded
    const { error } = await supabase
      .from('llm_jobs')
      .update({
        status: 'exhausted',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', 'waiting_llm')

    if (error) {
      console.error(`Failed to update job ${jobId} as exhausted:`, error)
    } else {
      console.log(`Job ${jobId} failed - max retries exhausted`)

      // Notify job exhausted (non-blocking)
      if (jobContext.userId) {
        notifyJobExhausted(supabase, {
          jobId,
          userId: jobContext.userId,
          customerId: jobContext.customerId,
          featureSlug: jobContext.featureSlug,
          errorMessage: errorMessage,
        }).catch((err) => console.error('Failed to send job exhausted notification:', err))
      }
    }
  }
}

// =============================================================================
// OpenAI Webhook Handling (Standard Webhooks + Response Retrieval)
// =============================================================================

/**
 * Handles OpenAI webhooks using Standard Webhooks format.
 * OpenAI webhook payloads only contain the response ID — the full output
 * must be retrieved via responses.retrieve().
 */
async function handleOpenAIWebhook(
  req: Request,
  rawBody: string,
  supabase: SupabaseClient,
  deps: HandlerDeps,
  llmProviders: LLMProviders,
  resolveProcessor: (slug: string | null | undefined) => ResponseProcessor | null
): Promise<Response> {
  const ack = () => new Response('OK', { status: 200 })

  // 1. Validate signature using OpenAI SDK (Standard Webhooks)
  const webhookSecret = deps.getEnv('OPENAI_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('OPENAI_WEBHOOK_SECRET not configured — rejecting webhook')
    return ack()
  }

  const openai = llmProviders.openai()

  // deno-lint-ignore no-explicit-any
  let event: { type: string; data: { id: string; [key: string]: unknown } }
  try {
    const headers = Object.fromEntries(req.headers.entries())
    // deno-lint-ignore no-explicit-any
    event = await (openai as any).webhooks.unwrap(rawBody, headers, webhookSecret)
  } catch (err) {
    console.error('OpenAI webhook signature verification failed:', err)
    await logDiagnostic(supabase, {
      event_type: 'signature_invalid',
      provider_slug: 'openai',
      error_message: err instanceof Error ? err.message : 'Signature verification failed',
    })
    return ack()
  }

  console.log(`Received OpenAI webhook: ${event.type}`)

  // 2. Extract response ID and look up job by llm_response_id
  const responseId = event.data?.id
  if (!responseId) {
    console.error('No response ID in OpenAI webhook payload')
    return ack()
  }

  const { data: job } = await supabase
    .from('llm_jobs')
    .select('id, status, customer_id, user_id, feature_slug, context, llm_response_id, retry_count, provider_id')
    .eq('llm_response_id', responseId)
    .maybeSingle()

  if (!job) {
    console.log(`No job found for OpenAI response: ${responseId}`)
    await logDiagnostic(supabase, {
      event_type: 'unknown_job',
      provider_slug: 'openai',
      error_message: `No job found for response ID: ${responseId}`,
      received_response_id: responseId,
    })
    return ack()
  }

  const jobId = job.id

  // Guard: cancelled
  if (job.status === 'cancelled') {
    console.log(`Ignoring webhook for cancelled job: ${jobId}`)
    return ack()
  }

  // Guard: terminal state
  const terminalStates = ['completed', 'error', 'exhausted', 'post_processing_failed']
  if (terminalStates.includes(job.status)) {
    console.log(`Ignoring webhook for terminal job ${jobId} (status: ${job.status})`)
    return ack()
  }

  // Guard: not in waiting_llm (unexpected state)
  if (job.status !== 'waiting_llm') {
    console.log(`Unexpected job status ${job.status} for webhook, job: ${jobId}`)
    await logDiagnostic(supabase, {
      event_type: 'unexpected_status',
      job_id: jobId,
      provider_slug: 'openai',
      customer_id: job.customer_id,
      job_status_at_receipt: job.status,
    })
    return ack()
  }

  // 3. Idempotency check using webhook-id header
  const webhookId = req.headers.get('webhook-id')
  if (webhookId) {
    const { data: isNewWebhook } = await supabase.rpc('llm_record_webhook', {
      p_webhook_id: webhookId,
      p_job_id: jobId,
      p_provider_slug: 'openai',
      p_event_type: event.type,
    })

    if (!isNewWebhook) {
      console.log(`Duplicate webhook ${webhookId} — already processed`)
      return ack()
    }
  }

  // 4. Process based on event type
  try {
    if (event.type === 'response.completed') {
      await handleOpenAICompleted(supabase, job, responseId, llmProviders, resolveProcessor)
    } else if (event.type === 'response.failed' || event.type === 'response.incomplete') {
      await handleOpenAIFailed(supabase, job, responseId, llmProviders)
    } else {
      console.log(`Unhandled OpenAI webhook event: ${event.type}`)
    }
  } catch (processingError) {
    const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown processing error'
    console.error(`OpenAI webhook processing failed for job ${jobId}:`, errorMessage)

    await logDiagnostic(supabase, {
      event_type: 'processing_error',
      job_id: jobId,
      provider_slug: 'openai',
      customer_id: job.customer_id,
      error_code: 'PROCESSING_FAILED',
      error_message: errorMessage,
      job_status_at_receipt: job.status,
    })

    await supabase.rpc('llm_add_to_dlq', {
      p_job_id: jobId,
      p_webhook_payload: event,
      p_error_message: errorMessage,
      p_provider_slug: 'openai',
      p_error_code: 'PROCESSING_FAILED',
    })
  }

  return ack()
}

/**
 * Handles a successful OpenAI response.
 * Retrieves the full response, runs the response processor, and marks the job completed.
 */
async function handleOpenAICompleted(
  supabase: SupabaseClient,
  // deno-lint-ignore no-explicit-any
  job: any,
  responseId: string,
  llmProviders: LLMProviders,
  resolveProcessor: (slug: string | null | undefined) => ResponseProcessor | null
): Promise<void> {
  const openai = llmProviders.openai()

  // Retrieve the full response from OpenAI
  // deno-lint-ignore no-explicit-any
  const fullResponse: any = await openai.responses.retrieve(responseId)

  const outputText = fullResponse.output_text
  if (!outputText) {
    throw new Error(`No output_text in retrieved OpenAI response ${responseId}`)
  }

  // Build result for storage
  const usage = fullResponse.usage
  const result = {
    output: outputText,
    usage: usage
      ? {
          prompt_tokens: usage.input_tokens,
          completion_tokens: usage.output_tokens,
          total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        }
      : undefined,
    model: fullResponse.model,
    response_id: responseId,
  }

  // Run response processor if registered for this feature
  const processor = resolveProcessor(job.feature_slug)
  if (processor) {
    // C3: Re-check job status before running processor (prevent domain writes on cancelled jobs)
    const { data: currentJob } = await supabase
      .from('llm_jobs')
      .select('status')
      .eq('id', job.id)
      .single()

    if (!currentJob || currentJob.status !== 'waiting_llm') {
      console.warn(`Job ${job.id} status changed to '${currentJob?.status}' before processor — skipping`)
      return
    }

    try {
      const safeContext = { ...job.context, customer_id: job.customer_id }
      await processor(supabase, outputText, safeContext)
    } catch (ppError) {
      const ppMessage = ppError instanceof Error ? ppError.message : 'Post-processing failed'
      console.error(`Post-processing failed for job ${job.id}:`, ppMessage)

      await supabase
        .from('llm_jobs')
        .update({
          status: 'post_processing_failed',
          result_ref: JSON.stringify(result),
          error_message: ppMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'waiting_llm')

      if (job.user_id) {
        notifyJobFailed(supabase, {
          jobId: job.id,
          userId: job.user_id,
          customerId: job.customer_id,
          featureSlug: job.feature_slug,
          errorMessage: ppMessage,
        }).catch((err: unknown) => console.error('Failed to send post-processing failure notification:', err))
      }

      return
    }
  }

  // Mark job as completed
  const { error } = await supabase
    .from('llm_jobs')
    .update({
      status: 'completed',
      result_ref: JSON.stringify(result),
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .eq('status', 'waiting_llm')

  if (error) {
    console.error(`Failed to update job ${job.id} as completed:`, error)
  } else {
    console.log(`Job ${job.id} completed successfully`)

    if (job.user_id) {
      notifyJobCompleted(supabase, {
        jobId: job.id,
        userId: job.user_id,
        customerId: job.customer_id,
        featureSlug: job.feature_slug,
      }).catch((err: unknown) => console.error('Failed to send job completed notification:', err))
    }
  }
}

/**
 * Handles a failed OpenAI response.
 * Retrieves error details and follows retry/exhausted logic.
 */
async function handleOpenAIFailed(
  supabase: SupabaseClient,
  // deno-lint-ignore no-explicit-any
  job: any,
  responseId: string,
  llmProviders: LLMProviders
): Promise<void> {
  const openai = llmProviders.openai()

  // Retrieve the response to get error details
  let errorMessage = 'Unknown error from OpenAI'
  try {
    // deno-lint-ignore no-explicit-any
    const fullResponse: any = await openai.responses.retrieve(responseId)
    if (fullResponse.error?.message) {
      errorMessage = fullResponse.error.message
    }
  } catch (retrieveError) {
    console.error(`Failed to retrieve error details for response ${responseId}:`, retrieveError)
  }

  // Get provider config for max retries
  const { data: provider } = await supabase
    .from('llm_providers')
    .select('max_retries')
    .eq('id', job.provider_id)
    .single()

  const maxRetries = provider?.max_retries || 1

  if (job.retry_count < maxRetries) {
    // Schedule for retry — update status and re-enqueue to pgmq for worker pickup
    const { error } = await supabase
      .from('llm_jobs')
      .update({
        status: 'retrying',
        retry_count: job.retry_count + 1,
        error_message: errorMessage,
      })
      .eq('id', job.id)
      .eq('status', 'waiting_llm')

    if (error) {
      console.error(`Failed to update job ${job.id} for retry:`, error)
    } else {
      // Re-enqueue to pgmq so the worker picks it up again
      const { error: enqueueError } = await supabase.rpc('llm_enqueue_job', {
        p_job_id: job.id,
      })
      if (enqueueError) {
        console.error(`Failed to re-enqueue job ${job.id} for retry:`, enqueueError)
      }
      console.log(`Job ${job.id} scheduled for retry (${job.retry_count + 1}/${maxRetries})`)
    }
  } else {
    const { error } = await supabase
      .from('llm_jobs')
      .update({
        status: 'exhausted',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('status', 'waiting_llm')

    if (error) {
      console.error(`Failed to update job ${job.id} as exhausted:`, error)
    } else {
      console.log(`Job ${job.id} failed — max retries exhausted`)

      if (job.user_id) {
        notifyJobExhausted(supabase, {
          jobId: job.id,
          userId: job.user_id,
          customerId: job.customer_id,
          featureSlug: job.feature_slug,
          errorMessage,
        }).catch((err: unknown) => console.error('Failed to send job exhausted notification:', err))
      }
    }
  }
}

// =============================================================================
// DLQ Replay (H2)
// =============================================================================

/**
 * DLQ replay request body (sent by llm_process_dlq via pg_net).
 */
interface DLQReplayRequest {
  dlq_id: string
  webhook_payload: unknown
  provider_slug: string
}

/**
 * Handles DLQ replay requests.
 *
 * When webhook processing fails (e.g., responses.retrieve() timeout), the
 * original webhook payload is stored in the DLQ. On retry, this function
 * re-processes that stored payload instead of submitting a new LLM request,
 * preserving the already-completed response.
 *
 * Authentication: requires x-queue-secret header (called from pg_cron via pg_net).
 * Skips signature validation and idempotency check (deliberate retry).
 */
async function handleDLQReplay(
  req: Request,
  supabase: SupabaseClient,
  deps: HandlerDeps,
  llmProviders: LLMProviders,
  resolveProcessor: (slug: string | null | undefined) => ResponseProcessor | null
): Promise<Response> {
  const ack = () => new Response('OK', { status: 200 })

  // Verify internal queue authentication
  const queueSecret = deps.getEnv('QUEUE_SECRET')?.trim()
  if (!queueSecret) {
    console.error('QUEUE_SECRET not configured for DLQ replay')
    return ack()
  }

  const provided = req.headers.get('x-queue-secret')?.trim() ?? ''
  if (!provided || !(await secureCompare(provided, queueSecret))) {
    console.error('Unauthorized DLQ replay request')
    return ack()
  }

  // Parse DLQ replay body
  let body: DLQReplayRequest
  try {
    body = await req.json()
  } catch {
    console.error('Invalid JSON in DLQ replay request')
    return ack()
  }

  const { dlq_id, webhook_payload, provider_slug } = body
  if (!dlq_id || !webhook_payload || !provider_slug) {
    console.error('Missing required fields in DLQ replay request')
    return ack()
  }

  console.log(`DLQ replay: processing entry ${dlq_id} for provider ${provider_slug}`)

  try {
    if (provider_slug === 'openai') {
      await replayOpenAIWebhook(supabase, webhook_payload, llmProviders, resolveProcessor)
    } else {
      await replayGenericWebhook(supabase, webhook_payload as WebhookPayload, provider_slug)
    }

    // Success — resolve the DLQ entry
    await supabase.rpc('llm_resolve_dlq', { p_dlq_id: dlq_id })
    console.log(`DLQ entry ${dlq_id} resolved successfully`)
  } catch (replayError) {
    // Failed again — DLQ entry stays pending for next retry attempt
    const errorMessage = replayError instanceof Error ? replayError.message : 'Unknown replay error'
    console.error(`DLQ replay failed for entry ${dlq_id}:`, errorMessage)

    await logDiagnostic(supabase, {
      event_type: 'dlq_replay_failed',
      provider_slug,
      error_code: 'DLQ_REPLAY_FAILED',
      error_message: errorMessage,
    })
  }

  return ack()
}

/**
 * Replays an OpenAI webhook from DLQ.
 * The stored payload is the unwrapped event { type, data: { id, ... } }.
 */
async function replayOpenAIWebhook(
  supabase: SupabaseClient,
  webhookPayload: unknown,
  llmProviders: LLMProviders,
  resolveProcessor: (slug: string | null | undefined) => ResponseProcessor | null
): Promise<void> {
  // deno-lint-ignore no-explicit-any
  const event = webhookPayload as { type: string; data: { id: string; [key: string]: unknown } }
  const responseId = event?.data?.id
  if (!responseId) {
    throw new Error('No response ID in stored OpenAI webhook payload')
  }

  // Look up job by llm_response_id
  const { data: job } = await supabase
    .from('llm_jobs')
    .select('id, status, customer_id, user_id, feature_slug, context, llm_response_id, retry_count, provider_id')
    .eq('llm_response_id', responseId)
    .maybeSingle()

  if (!job) {
    throw new Error(`No job found for response ID: ${responseId}`)
  }

  // Guard: only process if job is still in waiting_llm
  if (job.status !== 'waiting_llm') {
    console.log(`DLQ replay: job ${job.id} no longer in waiting_llm (status: ${job.status}) — skipping`)
    return
  }

  // Process based on event type
  if (event.type === 'response.completed') {
    await handleOpenAICompleted(supabase, job, responseId, llmProviders, resolveProcessor)
  } else if (event.type === 'response.failed' || event.type === 'response.incomplete') {
    await handleOpenAIFailed(supabase, job, responseId, llmProviders)
  } else {
    console.log(`DLQ replay: unhandled OpenAI event type: ${event.type}`)
  }
}

/**
 * Replays a non-OpenAI webhook from DLQ.
 * The stored payload is the original parsed webhook payload.
 */
async function replayGenericWebhook(
  supabase: SupabaseClient,
  payload: WebhookPayload,
  providerSlug: string
): Promise<void> {
  const jobId = extractJobId(payload, providerSlug)
  if (!jobId) {
    throw new Error('No job_id in stored webhook payload')
  }

  // Look up job
  const { data: jobCheck } = await supabase
    .from('llm_jobs')
    .select('status, customer_id, user_id, feature_slug')
    .eq('id', jobId)
    .single()

  if (!jobCheck) {
    throw new Error(`Job not found: ${jobId}`)
  }

  // Guard: only process if job is in a processable state
  if (jobCheck.status === 'cancelled' || ['completed', 'error', 'exhausted', 'post_processing_failed'].includes(jobCheck.status)) {
    console.log(`DLQ replay: job ${jobId} in terminal state (status: ${jobCheck.status}) — skipping`)
    return
  }

  await processWebhook(supabase, payload, providerSlug, jobId, {
    customerId: jobCheck.customer_id,
    userId: jobCheck.user_id,
    featureSlug: jobCheck.feature_slug,
  })
}
