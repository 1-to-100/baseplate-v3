-- =============================================================================
-- LLM Management: Dead Letter Queue (DLQ)
-- =============================================================================
-- Stores failed webhook processing attempts for retry with exponential backoff.
-- Part of the LLM Query Wrapper feature.
-- =============================================================================

-- =============================================================================
-- Table: llm_dead_letter_queue
-- =============================================================================

create table public.llm_dead_letter_queue (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.llm_jobs(id) on delete cascade,

  -- Original payload that failed
  webhook_payload jsonb not null,
  provider_slug varchar(50),

  -- Error tracking
  error_message text,
  error_code varchar(50),

  -- Retry tracking with exponential backoff
  retry_count int not null default 0,
  max_retries int not null default 7,
  next_retry_at timestamptz(6),

  -- Status
  status varchar(20) not null default 'pending',

  -- Timestamps
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp,
  resolved_at timestamptz(6),

  constraint llm_dlq_valid_status check (
    status in ('pending', 'processing', 'resolved', 'exhausted')
  )
);

comment on table public.llm_dead_letter_queue is
  'Stores failed webhook processing attempts for retry with exponential backoff';

comment on column public.llm_dead_letter_queue.webhook_payload is
  'Original webhook payload that failed processing';

comment on column public.llm_dead_letter_queue.retry_count is
  'Number of retry attempts made';

comment on column public.llm_dead_letter_queue.next_retry_at is
  'When the next retry should be attempted (exponential backoff)';

-- Index for pending items ready to retry
create index idx_llm_dlq_pending on public.llm_dead_letter_queue(next_retry_at)
  where status = 'pending';

-- Index for job lookups
create index idx_llm_dlq_job on public.llm_dead_letter_queue(job_id);

-- Index for status queries
create index idx_llm_dlq_status on public.llm_dead_letter_queue(status, created_at desc);

-- Trigger for updated_at
create trigger llm_dlq_updated_at
  before update on public.llm_dead_letter_queue
  for each row
  execute function public.update_updated_at_column();

-- =============================================================================
-- Function: llm_add_to_dlq
-- =============================================================================
-- Adds a failed webhook to the DLQ with initial backoff schedule.
-- =============================================================================

create or replace function public.llm_add_to_dlq(
  p_job_id uuid,
  p_webhook_payload jsonb,
  p_error_message text,
  p_provider_slug varchar(50) default null,
  p_error_code varchar(50) default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_dlq_id uuid;
begin
  insert into public.llm_dead_letter_queue (
    job_id,
    webhook_payload,
    provider_slug,
    error_message,
    error_code,
    next_retry_at
  ) values (
    p_job_id,
    p_webhook_payload,
    p_provider_slug,
    p_error_message,
    p_error_code,
    current_timestamp + interval '1 minute'  -- First retry in 1 minute
  )
  returning id into v_dlq_id;

  return v_dlq_id;
end;
$$;

comment on function public.llm_add_to_dlq(uuid, jsonb, text, varchar, varchar) is
  'Adds a failed webhook to the dead letter queue for retry';

-- =============================================================================
-- Function: llm_process_dlq
-- =============================================================================
-- Processes DLQ entries with exponential backoff.
-- Backoff schedule: 1m, 2m, 4m, 8m, 16m, 32m, 60m (capped)
-- =============================================================================

create or replace function public.llm_process_dlq()
returns table (
  dlq_id uuid,
  job_id uuid,
  action text,
  next_retry_at timestamptz
)
language plpgsql
security definer
as $$
declare
  item record;
  v_backoff_seconds int;
  v_next_retry timestamptz;
begin
  -- Process pending items ready for retry
  for item in
    select d.* from public.llm_dead_letter_queue d
    where d.status = 'pending'
      and d.next_retry_at <= current_timestamp
    order by d.next_retry_at
    for update skip locked
    limit 10
  loop
    -- Mark as processing
    update public.llm_dead_letter_queue
    set status = 'processing', updated_at = current_timestamp
    where id = item.id;

    if item.retry_count >= item.max_retries then
      -- Max retries exhausted
      update public.llm_dead_letter_queue
      set
        status = 'exhausted',
        resolved_at = current_timestamp,
        updated_at = current_timestamp
      where id = item.id;

      -- Mark associated job as exhausted
      update public.llm_jobs
      set
        status = 'exhausted',
        error_message = 'DLQ exhausted after ' || item.max_retries || ' retries: ' || item.error_message,
        completed_at = current_timestamp,
        updated_at = current_timestamp
      where id = item.job_id;

      -- Notify for alerting
      perform pg_notify('llm_dlq_exhausted', json_build_object(
        'dlq_id', item.id,
        'job_id', item.job_id,
        'error', item.error_message,
        'retry_count', item.retry_count
      )::text);

      dlq_id := item.id;
      job_id := item.job_id;
      action := 'exhausted';
      next_retry_at := null;
      return next;
    else
      -- Calculate exponential backoff: 2^retry_count minutes, capped at 60 minutes
      v_backoff_seconds := least(power(2, item.retry_count)::int * 60, 3600);
      v_next_retry := current_timestamp + (v_backoff_seconds || ' seconds')::interval;

      -- Schedule next retry
      update public.llm_dead_letter_queue
      set
        status = 'pending',
        retry_count = item.retry_count + 1,
        next_retry_at = v_next_retry,
        updated_at = current_timestamp
      where id = item.id;

      -- Update job status to retrying
      update public.llm_jobs
      set
        status = 'retrying',
        retry_count = item.retry_count + 1,
        updated_at = current_timestamp
      where id = item.job_id;

      dlq_id := item.id;
      job_id := item.job_id;
      action := 'retry_scheduled';
      next_retry_at := v_next_retry;
      return next;
    end if;
  end loop;
end;
$$;

comment on function public.llm_process_dlq() is
  'Processes DLQ entries with exponential backoff retry. Returns processed items.';

-- =============================================================================
-- Function: llm_resolve_dlq
-- =============================================================================
-- Manually resolves a DLQ entry (e.g., after manual intervention).
-- =============================================================================

create or replace function public.llm_resolve_dlq(p_dlq_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_updated int;
begin
  update public.llm_dead_letter_queue
  set
    status = 'resolved',
    resolved_at = current_timestamp,
    updated_at = current_timestamp
  where id = p_dlq_id
    and status in ('pending', 'processing');

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

comment on function public.llm_resolve_dlq(uuid) is
  'Manually resolves a DLQ entry after intervention';

-- =============================================================================
-- pg_cron: Schedule DLQ processor
-- =============================================================================

select cron.schedule(
  'llm-process-dlq',
  '* * * * *',  -- Every minute
  $$select * from public.llm_process_dlq()$$
);

-- =============================================================================
-- RLS Policies
-- =============================================================================

alter table public.llm_dead_letter_queue enable row level security;

-- System admins can view all DLQ entries
create policy llm_dlq_select_system_admin
  on public.llm_dead_letter_queue
  for select to authenticated
  using (public.is_system_admin());

-- DLQ entries are managed by system (service role bypasses RLS)
-- No direct user access for insert/update/delete
