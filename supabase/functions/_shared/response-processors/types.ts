/**
 * Response Processor Type Definition
 *
 * A response processor is a function that takes the raw LLM output and
 * writes domain-specific data to the database. Called by the worker after
 * a successful LLM call, before marking the job as completed.
 *
 * Processors are feature-coupled — they live alongside their edge functions.
 * Only this type definition and the registry are shared infrastructure.
 */

import type { SupabaseClient } from '../supabase.ts';

/**
 * Base context that every response processor receives.
 * The worker enforces customer_id from the job row (cross-tenant protection).
 * Features can extend this with additional keys via the index signature.
 */
export interface ProcessorContext {
  customer_id: string;
  [key: string]: unknown;
}

/**
 * Response processor function signature.
 *
 * @param supabase - Service client (bypasses RLS)
 * @param rawOutput - Raw text output from the LLM
 * @param context - Domain data from job.context JSONB, with customer_id enforced by the worker
 * @throws Error if validation or DB write fails (worker will set post_processing_failed status)
 */
export type ResponseProcessor = (
  supabase: SupabaseClient,
  rawOutput: string,
  context: ProcessorContext
) => Promise<void>;
