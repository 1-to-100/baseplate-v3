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

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

/**
 * Response processor function signature.
 *
 * @param supabase - Service client (bypasses RLS)
 * @param rawOutput - Raw text output from the LLM
 * @param context - Domain data from job.context JSONB (e.g., { customer_id, visual_style_guide_id })
 * @throws Error if validation or DB write fails (worker will set post_processing_failed status)
 */
export type ResponseProcessor = (
  supabase: SupabaseClient,
  rawOutput: string,
  context: Record<string, unknown>
) => Promise<void>;
