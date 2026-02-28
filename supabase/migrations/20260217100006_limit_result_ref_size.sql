-- =============================================================================
-- Migration: M2 — Add size constraint on llm_jobs.result_ref
-- =============================================================================
-- The result_ref column stores inline JSON (LLM output, usage, model info).
-- Without a size limit, a single malformed or unusually large response could
-- bloat the table. 512 KB is generous for typical LLM responses while
-- preventing unbounded growth.
-- =============================================================================

ALTER TABLE public.llm_jobs
  ADD CONSTRAINT llm_jobs_result_ref_max_size
  CHECK (octet_length(result_ref) <= 524288);

COMMENT ON CONSTRAINT llm_jobs_result_ref_max_size ON public.llm_jobs IS
  'Prevents table bloat: result_ref limited to 512 KB. Large results should use storage.';
