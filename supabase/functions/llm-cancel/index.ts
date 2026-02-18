/// <reference lib="deno.ns" />
/**
 * LLM Cancel Edge Function
 *
 * Allows users to cancel queued or in-progress LLM jobs.
 * Authorization is enforced via RLS policies on llm_jobs table.
 */

import { handleCors } from '../_shared/cors.ts'
import { authenticateRequestWithClient, type AuthResult } from '../_shared/auth.ts'
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts'
import { notifyJobCancelled } from '../_shared/llm-notifications.ts'

// =============================================================================
// Types
// =============================================================================

interface CancelRequest {
  job_id: string
}

interface CancelResponse {
  cancelled: boolean
  job_id: string
  message: string
}

/**
 * Dependencies that can be injected for testing
 */
export interface HandlerDeps {
  authenticateRequest: (req: Request) => Promise<AuthResult>
}

/**
 * Default dependencies using real implementations
 */
const defaultDeps: HandlerDeps = {
  authenticateRequest: authenticateRequestWithClient,
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Create a handler with injectable dependencies (for testing)
 */
export function createHandler(deps: HandlerDeps = defaultDeps) {
  return async function handler(req: Request): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    try {
      // Only accept POST requests
      if (req.method !== 'POST') {
        throw new ApiError('Method not allowed', 405)
      }

      // Authenticate user and get RLS-enforced client
      const { user, userClient } = await deps.authenticateRequest(req)

      if (!user.customer_id) {
        throw new ApiError('User must belong to a customer to cancel jobs', 403)
      }

      // Parse request body
      const body: CancelRequest = await req.json()

      if (!body.job_id || typeof body.job_id !== 'string') {
        throw new ApiError('job_id is required', 400)
      }

      // Use the RLS-enforced client from auth
      const supabase = userClient

      // Verify job exists (RLS filters to only jobs user can access)
      const { data: jobData, error: jobError } = await supabase
        .from('llm_jobs')
        .select('status, customer_id, user_id, feature_slug')
        .eq('id', body.job_id)
        .single()

      // If job not found, either doesn't exist OR user doesn't have access (RLS)
      if (jobError || !jobData) {
        throw new ApiError('Job not found', 404, 'JOB_NOT_FOUND')
      }

      // Check if job is in a cancellable state
      const terminalStates = ['completed', 'error', 'exhausted', 'cancelled']
      if (terminalStates.includes(jobData.status)) {
        throw new ApiError('Job is already in a terminal state and cannot be cancelled', 409, 'ALREADY_TERMINAL')
      }

      // Perform the cancellation (RLS ensures we can only update our own jobs)
      const { data, error } = await supabase
        .from('llm_jobs')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.job_id)
        .not('status', 'in', `(${terminalStates.map(s => `'${s}'`).join(',')})`)
        .select('id')
        .single()

      if (error) {
        throw new ApiError(`Failed to cancel job: ${error.message}`, 500)
      }

      // data will be the updated row if successful, null if no rows matched
      const cancelled = data !== null

      // Send notification if job was cancelled and user exists (non-blocking)
      if (cancelled && jobData.user_id) {
        notifyJobCancelled(supabase, {
          jobId: body.job_id,
          userId: jobData.user_id,
          customerId: jobData.customer_id,
          featureSlug: jobData.feature_slug,
        }).catch((err) => console.error('Failed to send job cancelled notification:', err))
      }

      const response: CancelResponse = {
        cancelled,
        job_id: body.job_id,
        message: cancelled ? 'Job cancelled successfully' : 'Job was not cancelled (may have already completed)',
      }

      return createSuccessResponse(response)
    } catch (error) {
      return createErrorResponse(error)
    }
  }
}

/**
 * Main request handler - exported for direct testing without DI
 */
export const handler = createHandler()

// Start the server - Supabase Edge Functions runtime requires this
Deno.serve(handler)
