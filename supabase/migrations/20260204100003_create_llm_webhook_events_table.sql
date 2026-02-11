-- =============================================================================
-- LLM Management: Create llm_webhook_events table
-- =============================================================================
-- Ensures idempotent webhook processing by tracking received webhook IDs.
-- Part of the LLM Query Wrapper feature.
-- =============================================================================

-- Table: llm_webhook_events
-- Tracks received webhooks to prevent duplicate processing
create table public.llm_webhook_events (
  id uuid primary key default gen_random_uuid(),
  webhook_id varchar(255) not null unique,  -- Provider's webhook ID
  job_id uuid references public.llm_jobs(id) on delete cascade,
  provider_slug varchar(50),
  event_type varchar(50),  -- response.completed, response.failed, etc.
  received_at timestamptz(6) not null default current_timestamp
);

comment on table public.llm_webhook_events is
  'Tracks received webhooks to prevent duplicate processing (idempotency)';

comment on column public.llm_webhook_events.webhook_id is
  'Unique webhook identifier from the LLM provider';

comment on column public.llm_webhook_events.job_id is
  'Associated LLM job';

comment on column public.llm_webhook_events.provider_slug is
  'Provider that sent this webhook (openai, anthropic, etc.)';

comment on column public.llm_webhook_events.event_type is
  'Type of webhook event (response.completed, response.failed)';

comment on column public.llm_webhook_events.received_at is
  'When the webhook was received';

-- Index for job lookups
create index idx_llm_webhook_events_job on public.llm_webhook_events(job_id);

-- Index for cleanup queries (delete old events)
create index idx_llm_webhook_events_received on public.llm_webhook_events(received_at);

-- =============================================================================
-- Function: llm_record_webhook
-- =============================================================================
-- Records a webhook event with idempotency check.
-- Returns TRUE if this is a new webhook, FALSE if already processed.
-- =============================================================================
create or replace function public.llm_record_webhook(
  p_webhook_id varchar(255),
  p_job_id uuid,
  p_provider_slug varchar(50) default null,
  p_event_type varchar(50) default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  -- Attempt to insert the webhook event
  -- ON CONFLICT DO NOTHING means duplicate webhook_ids are silently ignored
  insert into public.llm_webhook_events (webhook_id, job_id, provider_slug, event_type)
  values (p_webhook_id, p_job_id, p_provider_slug, p_event_type)
  on conflict (webhook_id) do nothing
  returning id into inserted_id;

  -- Return TRUE if inserted (new webhook), FALSE if duplicate
  return inserted_id is not null;
end;
$$;

comment on function public.llm_record_webhook(varchar, uuid, varchar, varchar) is
  'Records a webhook event with idempotency check. Returns TRUE if new, FALSE if duplicate.';

-- =============================================================================
-- Function: llm_cleanup_old_webhook_events
-- =============================================================================
-- Removes webhook events older than the specified interval.
-- Called by pg_cron to prevent unbounded table growth.
-- =============================================================================
create or replace function public.llm_cleanup_old_webhook_events(
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
  delete from public.llm_webhook_events
  where received_at < current_timestamp - p_older_than;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.llm_cleanup_old_webhook_events(interval) is
  'Removes webhook events older than the specified interval to prevent table bloat.';

-- =============================================================================
-- pg_cron: Schedule webhook cleanup
-- =============================================================================
-- Daily cleanup of webhook events older than 30 days
select cron.schedule(
  'llm-cleanup-webhook-events',
  '0 3 * * *',  -- 3 AM UTC daily
  $$select public.llm_cleanup_old_webhook_events(interval '30 days')$$
);

-- =============================================================================
-- RLS Policies
-- =============================================================================
-- Webhook events are internal system data, accessible for debugging.
-- Read access for users who can access the related job's customer.
-- Write access only for system (service role bypasses RLS).

alter table public.llm_webhook_events enable row level security;

create policy llm_webhook_events_select_via_job
  on public.llm_webhook_events
  for select to authenticated
  using (
    exists (
      select 1 from public.llm_jobs j
      where j.id = llm_webhook_events.job_id
        and public.can_access_customer(j.customer_id)
    )
  );

-- Insert/Update/Delete only via service role (Edge Functions)
-- No authenticated user policies for write operations
-- Service role bypasses RLS automatically
