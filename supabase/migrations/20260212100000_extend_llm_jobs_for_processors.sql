-- =============================================================================
-- LLM Management: Extend llm_jobs for Response Processors
-- =============================================================================
-- Adds columns for multimodal messages, domain context, API method selection,
-- and a new terminal status for post-processing failures.
-- Part of the background extraction via LLM job system feature.
-- =============================================================================

-- Add new columns with safe defaults (no data migration needed)
ALTER TABLE public.llm_jobs
  ADD COLUMN IF NOT EXISTS messages jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS api_method varchar(20) NOT NULL DEFAULT 'chat';

comment on column public.llm_jobs.messages is
  'Multimodal message arrays for Chat Completions API. Used INSTEAD of constructing from prompt when present. Supports image_url content parts.';

comment on column public.llm_jobs.context is
  'Domain data for response processors (e.g., visual_style_guide_id). NOT spread onto LLM API calls.';

comment on column public.llm_jobs.api_method is
  'Which OpenAI API to use: chat = Chat Completions, responses = Responses API (for tools like web_search).';

-- Widen status column to accommodate 'post_processing_failed' (24 chars > old 20 limit)
ALTER TABLE public.llm_jobs ALTER COLUMN status TYPE varchar(30);

-- Update status constraint to include post_processing_failed
ALTER TABLE public.llm_jobs DROP CONSTRAINT IF EXISTS llm_jobs_valid_status;
ALTER TABLE public.llm_jobs ADD CONSTRAINT llm_jobs_valid_status CHECK (
  status IN ('queued', 'running', 'waiting_llm', 'retrying', 'completed',
             'error', 'exhausted', 'cancelled', 'post_processing_failed')
);

-- Add constraint for valid api_method values
ALTER TABLE public.llm_jobs ADD CONSTRAINT llm_jobs_valid_api_method CHECK (
  api_method IN ('chat', 'responses')
);

-- Update the active jobs index to also exclude post_processing_failed
DROP INDEX IF EXISTS idx_llm_jobs_status_active;
CREATE INDEX idx_llm_jobs_status_active ON public.llm_jobs(status, created_at)
  WHERE status NOT IN ('completed', 'error', 'exhausted', 'cancelled', 'post_processing_failed');

-- Update the cancel function to recognize post_processing_failed as terminal
CREATE OR REPLACE FUNCTION public.llm_cancel_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_status varchar;
  v_updated int;
BEGIN
  -- Get job info and verify ownership
  SELECT customer_id, status
  INTO v_customer_id, v_status
  FROM public.llm_jobs
  WHERE id = p_job_id;

  -- Job not found
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  -- Check access permission
  IF NOT public.can_access_customer(v_customer_id) THEN
    RAISE EXCEPTION 'Access denied to job: %', p_job_id;
  END IF;

  -- Check if job is in a cancellable state (include post_processing_failed as terminal)
  IF v_status IN ('completed', 'error', 'exhausted', 'cancelled', 'post_processing_failed') THEN
    RAISE EXCEPTION 'Cannot cancel job in terminal state: %', v_status;
  END IF;

  -- Cancel the job
  UPDATE public.llm_jobs
  SET
    status = 'cancelled',
    cancelled_at = current_timestamp,
    completed_at = current_timestamp,
    updated_at = current_timestamp
  WHERE id = p_job_id
    AND status NOT IN ('completed', 'error', 'exhausted', 'cancelled', 'post_processing_failed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;
