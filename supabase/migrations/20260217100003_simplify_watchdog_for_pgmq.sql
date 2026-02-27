-- =============================================================================
-- Migration: Simplify watchdog to only target waiting_llm jobs
-- =============================================================================
-- With pgmq's visibility timeout (VT), jobs stuck in 'running' state are
-- recovered automatically -- the pgmq message reappears after VT expires and
-- the worker retries. The watchdog now only needs to handle 'waiting_llm'
-- jobs where OpenAI never sends a webhook (network failure, outage, etc).
--
-- When retrying a waiting_llm job, the original pgmq message was already
-- deleted (consumed when the worker submitted to OpenAI). So this function
-- re-enqueues the job to pgmq for worker pickup.
--
-- Depends on: 20260217100002_create_pgmq_llm_dispatch.sql (pgmq extension)
-- =============================================================================

create or replace function public.llm_process_stuck_jobs()
returns table (
  job_id uuid,
  action text,
  provider_slug varchar,
  retry_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
begin
  -- Only target waiting_llm jobs -- pgmq VT handles running job recovery
  for v_job in
    select
      j.id,
      j.retry_count as current_retry_count,
      p.slug as p_slug,
      p.timeout_seconds,
      p.max_retries
    from public.llm_jobs j
    join public.llm_providers p on j.provider_id = p.id
    where j.status = 'waiting_llm'
      and j.updated_at < current_timestamp - (p.timeout_seconds || ' seconds')::interval
    for update of j skip locked
  loop
    if v_job.current_retry_count < v_job.max_retries then
      -- Retry: update status and re-enqueue to pgmq
      update public.llm_jobs
      set
        status = 'retrying',
        retry_count = llm_jobs.retry_count + 1,
        error_message = 'Timeout: No webhook response after ' || v_job.timeout_seconds || 's',
        updated_at = current_timestamp
      where id = v_job.id;

      -- Re-enqueue to pgmq for worker pickup
      -- (original message was deleted when worker submitted to OpenAI)
      perform pgmq.send('llm_dispatch', jsonb_build_object('job_id', v_job.id));

      job_id := v_job.id;
      action := 'retried';
      provider_slug := v_job.p_slug;
      retry_count := v_job.current_retry_count + 1;
      return next;
    else
      -- Exhausted: no more retries
      update public.llm_jobs
      set
        status = 'exhausted',
        error_message = 'Timeout: No webhook response after ' || v_job.max_retries || ' retry attempts',
        completed_at = current_timestamp,
        updated_at = current_timestamp
      where id = v_job.id;

      job_id := v_job.id;
      action := 'exhausted';
      provider_slug := v_job.p_slug;
      retry_count := v_job.current_retry_count;
      return next;
    end if;
  end loop;
end;
$$;

comment on function public.llm_process_stuck_jobs() is
  'Recovers jobs stuck in waiting_llm state (webhook never arrived). Re-enqueues retryable jobs to pgmq. Running jobs are recovered by pgmq visibility timeout.';
