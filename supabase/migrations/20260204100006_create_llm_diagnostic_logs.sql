-- =============================================================================
-- LLM Management: Diagnostic Logs
-- =============================================================================
-- Captures edge cases, late responses, and debugging information for
-- troubleshooting LLM job processing issues.
-- Part of the LLM Query Wrapper feature.
-- =============================================================================

-- =============================================================================
-- Table: llm_diagnostic_logs
-- =============================================================================

create table public.llm_diagnostic_logs (
  id uuid primary key default gen_random_uuid(),

  -- Context
  job_id uuid references public.llm_jobs(id) on delete set null,
  provider_slug varchar(50),
  customer_id uuid references public.customers(customer_id) on delete set null,

  -- Event details
  event_type varchar(50) not null,
  -- Types:
  --   'unknown_job' - webhook for job that doesn't exist
  --   'cancelled_job_response' - response for cancelled job
  --   'late_failure_response' - error response for already terminal job
  --   'late_success_ignored' - success response for already terminal job
  --   'stale_response' - response_id doesn't match expected
  --   'duplicate_webhook' - webhook already processed (idempotency)
  --   'processing_error' - error during webhook processing
  --   'signature_invalid' - webhook signature validation failed

  -- Error details
  error_code varchar(100),
  error_message text,

  -- State at receipt
  job_status_at_receipt varchar(20),
  expected_response_id varchar(255),
  received_response_id varchar(255),

  -- Full payload for debugging
  response_payload jsonb,

  -- Audit
  created_at timestamptz(6) not null default current_timestamp
);

comment on table public.llm_diagnostic_logs is
  'Captures edge cases and debugging information for LLM job processing';

comment on column public.llm_diagnostic_logs.event_type is
  'Type of diagnostic event: unknown_job, cancelled_job_response, late_failure_response, late_success_ignored, stale_response, duplicate_webhook, processing_error, signature_invalid';

-- Indexes for common queries
create index idx_llm_diagnostic_provider on public.llm_diagnostic_logs(provider_slug, created_at desc);
create index idx_llm_diagnostic_event on public.llm_diagnostic_logs(event_type, created_at desc);
create index idx_llm_diagnostic_job on public.llm_diagnostic_logs(job_id) where job_id is not null;
create index idx_llm_diagnostic_customer on public.llm_diagnostic_logs(customer_id) where customer_id is not null;

-- =============================================================================
-- Function: llm_log_diagnostic
-- =============================================================================
-- Logs a diagnostic event for troubleshooting.
-- =============================================================================

create or replace function public.llm_log_diagnostic(
  p_event_type varchar(50),
  p_job_id uuid default null,
  p_provider_slug varchar(50) default null,
  p_customer_id uuid default null,
  p_error_code varchar(100) default null,
  p_error_message text default null,
  p_job_status_at_receipt varchar(20) default null,
  p_expected_response_id varchar(255) default null,
  p_received_response_id varchar(255) default null,
  p_response_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  insert into public.llm_diagnostic_logs (
    event_type,
    job_id,
    provider_slug,
    customer_id,
    error_code,
    error_message,
    job_status_at_receipt,
    expected_response_id,
    received_response_id,
    response_payload
  ) values (
    p_event_type,
    p_job_id,
    p_provider_slug,
    p_customer_id,
    p_error_code,
    p_error_message,
    p_job_status_at_receipt,
    p_expected_response_id,
    p_received_response_id,
    p_response_payload
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

comment on function public.llm_log_diagnostic is
  'Logs a diagnostic event for troubleshooting LLM job processing';

-- =============================================================================
-- Function: llm_get_diagnostic_summary
-- =============================================================================
-- Returns summary of diagnostic events for monitoring dashboards.
-- =============================================================================

create or replace function public.llm_get_diagnostic_summary(
  p_hours int default 24,
  p_provider_slug varchar(50) default null
)
returns table (
  event_type varchar,
  count bigint,
  latest_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return query
  select
    d.event_type,
    count(*)::bigint,
    max(d.created_at) as latest_at
  from public.llm_diagnostic_logs d
  where d.created_at > current_timestamp - (p_hours || ' hours')::interval
    and (p_provider_slug is null or d.provider_slug = p_provider_slug)
  group by d.event_type
  order by count(*) desc;
end;
$$;

comment on function public.llm_get_diagnostic_summary(int, varchar) is
  'Returns summary of diagnostic events for monitoring dashboards';

grant execute on function public.llm_get_diagnostic_summary(int, varchar) to authenticated;

-- =============================================================================
-- Cleanup: Remove old diagnostic logs
-- =============================================================================
-- Keep 30 days of diagnostic logs to prevent unbounded growth.

create or replace function public.llm_cleanup_diagnostic_logs(
  p_older_than interval default interval '30 days'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  delete from public.llm_diagnostic_logs
  where created_at < current_timestamp - p_older_than;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Schedule daily cleanup
select cron.schedule(
  'llm-cleanup-diagnostic-logs',
  '0 4 * * *',  -- 4 AM UTC daily
  $$select public.llm_cleanup_diagnostic_logs(interval '30 days')$$
);

-- =============================================================================
-- RLS Policies
-- =============================================================================

alter table public.llm_diagnostic_logs enable row level security;

-- System admins can view all diagnostic logs
create policy llm_diagnostic_select_system_admin
  on public.llm_diagnostic_logs
  for select to authenticated
  using (public.is_system_admin());

-- Customer success can view logs for customers they can access
create policy llm_diagnostic_select_customer_access
  on public.llm_diagnostic_logs
  for select to authenticated
  using (
    customer_id is not null
    and public.can_access_customer(customer_id)
  );
