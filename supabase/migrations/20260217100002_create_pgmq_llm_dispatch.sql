-- =============================================================================
-- Migration: Enable pgmq and create LLM dispatch queue
-- =============================================================================
-- Replaces the race-prone PostgREST .update().limit(1) job claiming pattern
-- with pgmq's atomic dequeue (FOR UPDATE SKIP LOCKED + visibility timeout).
--
-- The llm_dispatch queue holds lightweight references ({ job_id }) to jobs in
-- llm_jobs. The queue is the dispatch mechanism; llm_jobs remains the single
-- source of truth for job state, results, metadata, RLS, and Realtime.
--
-- Visibility timeout (VT) provides automatic retry of stuck messages:
-- if a worker crashes mid-processing, the message reappears after VT expires.
-- =============================================================================

-- Enable pgmq extension (first-party Supabase extension)
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the dispatch queue
SELECT pgmq.create('llm_dispatch');

-- =============================================================================
-- RPC wrappers (SECURITY DEFINER)
-- =============================================================================
-- These functions provide a clean RPC interface for Edge Functions without
-- requiring pgmq_public schema configuration or RLS on pgmq tables.

-- Enqueue a job for worker pickup (called by llm-query)
CREATE OR REPLACE FUNCTION public.llm_enqueue_job(p_job_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.send('llm_dispatch', jsonb_build_object('job_id', p_job_id));
END;
$$;

GRANT EXECUTE ON FUNCTION public.llm_enqueue_job(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.llm_enqueue_job(uuid) FROM anon;

-- Read messages from the dispatch queue (called by llm-worker)
CREATE OR REPLACE FUNCTION public.llm_read_dispatch_queue(
  p_vt integer DEFAULT 300,
  p_qty integer DEFAULT 10
)
RETURNS TABLE (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.enqueued_at, r.vt, r.message
  FROM pgmq.read('llm_dispatch', p_vt, p_qty) r;
END;
$$;

-- Delete a processed message from the dispatch queue
CREATE OR REPLACE FUNCTION public.llm_delete_dispatch_message(p_msg_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.delete('llm_dispatch', p_msg_id);
END;
$$;

-- Archive a message (preserves in pgmq.a_llm_dispatch for history)
CREATE OR REPLACE FUNCTION public.llm_archive_dispatch_message(p_msg_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.archive('llm_dispatch', p_msg_id);
END;
$$;
