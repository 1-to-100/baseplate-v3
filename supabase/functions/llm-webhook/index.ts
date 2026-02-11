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
import {
  notifyJobCompleted,
  notifyJobExhausted,
} from '../_shared/llm-notifications.ts'

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

// deno-lint-ignore no-explicit-any
type SupabaseClient = any

/**
 * Dependencies that can be injected for testing
 */
export interface HandlerDeps {
  createServiceClient: () => SupabaseClient
  getEnv: (key: string) => string | undefined
}

/**
 * Default dependencies using real implementations
 */
const defaultDeps: HandlerDeps = {
  createServiceClient,
  getEnv: (key: string) => Deno.env.get(key),
}

// =============================================================================
// Diagnostic Logging Helper
// =============================================================================

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
  return async function handler(req: Request): Promise<Response> {
    // Always return 200 to acknowledge webhook receipt
    const ack = () => new Response('OK', { status: 200 })

    try {
      const supabase = deps.createServiceClient()

      // Determine provider from headers or path
      const url = new URL(req.url)
      const providerSlug = url.searchParams.get('provider') || detectProvider(req)

      if (!providerSlug) {
        console.error('Unable to determine webhook provider')
        return ack()
      }

      // Get raw body for signature verification
      const rawBody = await req.text()

      // Validate webhook signature
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
          response_payload: payload,
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
          response_payload: payload,
        })
        return ack()
      }

      // Guard 3: Job already in terminal state
      const terminalStates = ['completed', 'error', 'exhausted']
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
          response_payload: payload,
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
          response_payload: payload,
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
          response_payload: payload,
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
// Provider Detection
// =============================================================================

export function detectProvider(req: Request): string | null {
  const userAgent = req.headers.get('user-agent') || ''

  // OpenAI webhooks
  if (req.headers.has('openai-signature')) {
    return 'openai'
  }

  // Anthropic webhooks
  if (req.headers.has('anthropic-signature')) {
    return 'anthropic'
  }

  // Google/Gemini webhooks
  if (userAgent.includes('Google') || req.headers.has('x-goog-signature')) {
    return 'gemini'
  }

  return null
}

// =============================================================================
// Signature Validation
// =============================================================================

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)

  let result = 0
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i]
  }

  return result === 0
}

async function validateWebhookSignature(
  req: Request,
  rawBody: string,
  provider: string,
  deps: HandlerDeps
): Promise<boolean> {
  switch (provider) {
    case 'openai':
      return validateOpenAISignature(req, rawBody, deps)
    case 'anthropic':
      return validateAnthropicSignature(req, rawBody, deps)
    case 'gemini':
      return await validateGeminiSignature(req, rawBody, deps)
    default:
      return false
  }
}

async function validateOpenAISignature(req: Request, rawBody: string, deps: HandlerDeps): Promise<boolean> {
  const signature = req.headers.get('openai-signature')
  const webhookSecret = deps.getEnv('OPENAI_WEBHOOK_SECRET')

  if (!webhookSecret) {
    console.error('OPENAI_WEBHOOK_SECRET not configured - rejecting webhook')
    return false
  }

  if (!signature) {
    return false
  }

  // OpenAI uses HMAC-SHA256
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
  return secureCompare(signature, expectedSignature)
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
  return secureCompare(signature, expectedSignature)
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
  return secureCompare(signature, expectedSignature)
}

// =============================================================================
// Job ID Extraction
// =============================================================================

export function extractJobId(payload: WebhookPayload, provider: string): string | null {
  // Check metadata first (standard location)
  if (payload.metadata?.job_id) {
    return payload.metadata.job_id
  }

  // Provider-specific fallbacks
  switch (provider) {
    case 'openai':
      // OpenAI Responses API includes metadata in response
      return (payload as unknown as { metadata?: { job_id?: string } })?.metadata?.job_id || null
    case 'anthropic':
      // Anthropic may use different field names
      return (payload as unknown as { custom_id?: string })?.custom_id || null
    case 'gemini':
      // Gemini may include in different location
      return null
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
    // Schedule for retry
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
