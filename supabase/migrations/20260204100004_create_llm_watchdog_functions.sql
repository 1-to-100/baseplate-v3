-- =============================================================================
-- LLM Management: Watchdog and Cancellation Functions
-- =============================================================================
-- Provides resilience features for stuck job recovery and user-initiated
-- cancellation. Part of the LLM Query Wrapper feature.
-- =============================================================================

-- =============================================================================
-- Function: llm_process_stuck_jobs
-- =============================================================================
-- Detects jobs stuck in 'waiting_llm' or 'running' state beyond their timeout
-- and either retries them or marks them as failed.
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions.
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
begin
  -- Process stuck jobs in waiting_llm state
  return query
  with stuck_jobs as (
    select
      j.id,
      j.provider_id,
      j.retry_count as current_retry_count,
      p.slug as provider_slug,
      p.timeout_seconds,
      p.max_retries
    from public.llm_jobs j
    join public.llm_providers p on j.provider_id = p.id
    where j.status in ('waiting_llm', 'running')
      and j.updated_at < current_timestamp - (p.timeout_seconds || ' seconds')::interval
    for update of j skip locked
  ),
  -- Retry jobs that haven't exceeded max retries
  retried as (
    update public.llm_jobs j
    set
      status = 'retrying',
      retry_count = j.retry_count + 1,
      error_message = 'Timeout: Scheduled for retry after ' || s.timeout_seconds || 's with no response',
      updated_at = current_timestamp
    from stuck_jobs s
    where j.id = s.id
      and s.current_retry_count < s.max_retries
    returning j.id, 'retried'::text as action, s.provider_slug, j.retry_count
  ),
  -- Fail jobs that have exceeded max retries
  exhausted as (
    update public.llm_jobs j
    set
      status = 'exhausted',
      error_message = 'Timeout: No response from LLM provider after ' || s.max_retries || ' retry attempts',
      completed_at = current_timestamp,
      updated_at = current_timestamp
    from stuck_jobs s
    where j.id = s.id
      and s.current_retry_count >= s.max_retries
    returning j.id, 'exhausted'::text as action, s.provider_slug, j.retry_count
  )
  select * from retried
  union all
  select * from exhausted;
end;
$$;

comment on function public.llm_process_stuck_jobs() is
  'Detects and recovers jobs stuck in waiting_llm/running state beyond timeout. Returns processed jobs with actions taken.';

-- =============================================================================
-- Function: llm_cancel_job
-- =============================================================================
-- Allows users to cancel a job that hasn't reached a terminal state.
-- Only the job's owner (same customer) can cancel it.
-- =============================================================================

create or replace function public.llm_cancel_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_status varchar;
  v_updated int;
begin
  -- Get job info and verify ownership
  select customer_id, status
  into v_customer_id, v_status
  from public.llm_jobs
  where id = p_job_id;

  -- Job not found
  if v_customer_id is null then
    raise exception 'Job not found: %', p_job_id;
  end if;

  -- Check access permission
  if not public.can_access_customer(v_customer_id) then
    raise exception 'Access denied to job: %', p_job_id;
  end if;

  -- Check if job is in a cancellable state
  if v_status in ('completed', 'error', 'exhausted', 'cancelled') then
    raise exception 'Cannot cancel job in terminal state: %', v_status;
  end if;

  -- Cancel the job
  update public.llm_jobs
  set
    status = 'cancelled',
    cancelled_at = current_timestamp,
    completed_at = current_timestamp,
    updated_at = current_timestamp
  where id = p_job_id
    and status not in ('completed', 'error', 'exhausted', 'cancelled');

  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

comment on function public.llm_cancel_job(uuid) is
  'Cancels an LLM job if it is not in a terminal state. Validates ownership via RLS.';

-- Grant execute permission to authenticated users
grant execute on function public.llm_cancel_job(uuid) to authenticated;

-- =============================================================================
-- Function: llm_get_job_stats
-- =============================================================================
-- Returns aggregate statistics about LLM jobs for monitoring.
-- Useful for dashboards and alerting.
-- =============================================================================

create or replace function public.llm_get_job_stats(
  p_customer_id uuid default null,
  p_hours int default null
)
returns table (
  status varchar,
  count bigint,
  avg_duration_seconds numeric,
  oldest_job_age_seconds numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return query
  select
    j.status,
    count(*)::bigint,
    avg(
      case
        when j.completed_at is not null then
          extract(epoch from (j.completed_at - j.created_at))
        else null
      end
    )::numeric as avg_duration_seconds,
    max(extract(epoch from (current_timestamp - j.created_at)))::numeric as oldest_job_age_seconds
  from public.llm_jobs j
  where (p_customer_id is null or j.customer_id = p_customer_id)
    and (p_hours is null or j.created_at > current_timestamp - (p_hours || ' hours')::interval)
  group by j.status;
end;
$$;

comment on function public.llm_get_job_stats(uuid, int) is
  'Returns aggregate statistics about LLM jobs for monitoring and alerting.';

grant execute on function public.llm_get_job_stats(uuid, int) to authenticated;

-- =============================================================================
-- pg_cron: Schedule watchdog job
-- =============================================================================
-- Run every 5 minutes to detect and recover stuck jobs

select cron.schedule(
  'llm-process-stuck-jobs',
  '*/5 * * * *',  -- Every 5 minutes
  $$select * from public.llm_process_stuck_jobs()$$
);
