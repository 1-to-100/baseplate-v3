-- =============================================================================
-- LLM Management: Create llm_jobs table
-- =============================================================================
-- Tracks LLM query jobs through their lifecycle with a status state machine.
-- Part of the LLM Query Wrapper feature.
-- =============================================================================

-- Table: llm_jobs
-- Tracks LLM query jobs through their lifecycle
create table public.llm_jobs (
  id uuid primary key default gen_random_uuid(),

  -- Ownership
  customer_id uuid not null references public.customers(customer_id) on delete cascade,
  user_id uuid references public.users(user_id) on delete set null,

  -- Provider
  provider_id uuid not null references public.llm_providers(id),

  -- Request
  prompt text not null,
  input jsonb not null default '{}',
  system_prompt text,
  feature_slug varchar(100),  -- For analytics: which feature initiated this job

  -- Status State Machine
  -- Valid transitions: queued -> running -> waiting_llm -> completed/error/retrying
  --                    retrying -> waiting_llm -> completed/error/retrying/exhausted
  --                    Any non-terminal -> cancelled
  status varchar(20) not null default 'queued',
  llm_response_id varchar(255),  -- Provider's response ID for correlation
  retry_count int not null default 0,

  -- Result
  result_ref text,        -- Reference to result (inline JSON or storage URL)
  error_message text,

  -- Timestamps
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp,
  started_at timestamptz(6),     -- When job started processing
  completed_at timestamptz(6),   -- When job reached terminal state
  cancelled_at timestamptz(6),   -- When job was cancelled

  -- Constraints
  constraint llm_jobs_valid_status check (
    status in ('queued', 'running', 'waiting_llm', 'retrying', 'completed', 'error', 'exhausted', 'cancelled')
  )
);

comment on table public.llm_jobs is
  'Tracks LLM query jobs through their lifecycle';

comment on column public.llm_jobs.id is
  'Primary key identifier';

comment on column public.llm_jobs.customer_id is
  'Customer who owns this job (for multi-tenant isolation)';

comment on column public.llm_jobs.user_id is
  'User who initiated this job (optional)';

comment on column public.llm_jobs.provider_id is
  'LLM provider to use for this job';

comment on column public.llm_jobs.prompt is
  'The prompt text to send to the LLM';

comment on column public.llm_jobs.input is
  'Additional input parameters as JSON';

comment on column public.llm_jobs.system_prompt is
  'Optional system prompt for the LLM';

comment on column public.llm_jobs.feature_slug is
  'Feature identifier for analytics (e.g., content-generator, segment-analysis)';

comment on column public.llm_jobs.status is
  'Current job status: queued, running, waiting_llm, retrying, completed, error, exhausted, cancelled';

comment on column public.llm_jobs.llm_response_id is
  'Provider response ID for webhook correlation';

comment on column public.llm_jobs.retry_count is
  'Number of retry attempts made';

comment on column public.llm_jobs.result_ref is
  'Reference to the job result (inline JSON or storage URL for large results)';

comment on column public.llm_jobs.error_message is
  'Error message if job failed';

comment on column public.llm_jobs.started_at is
  'When the job started processing';

comment on column public.llm_jobs.completed_at is
  'When the job reached a terminal state';

comment on column public.llm_jobs.cancelled_at is
  'When the job was cancelled by user';

-- Indexes for common queries
-- Jobs by customer (most recent first)
create index idx_llm_jobs_customer on public.llm_jobs(customer_id, created_at desc);

-- Jobs by user
create index idx_llm_jobs_user on public.llm_jobs(user_id, created_at desc) where user_id is not null;

-- Active jobs (non-terminal status) for queue processing
create index idx_llm_jobs_status_active on public.llm_jobs(status, created_at)
  where status not in ('completed', 'error', 'exhausted', 'cancelled');

-- Jobs waiting for LLM response (for timeout watchdog)
create index idx_llm_jobs_waiting_llm on public.llm_jobs(provider_id, updated_at)
  where status = 'waiting_llm';

-- Jobs by feature for analytics
create index idx_llm_jobs_feature on public.llm_jobs(feature_slug, created_at desc)
  where feature_slug is not null;

-- Response ID lookup for webhook processing
create index idx_llm_jobs_response_id on public.llm_jobs(llm_response_id)
  where llm_response_id is not null;

-- Trigger for updated_at
create trigger llm_jobs_updated_at
  before update on public.llm_jobs
  for each row
  execute function public.update_updated_at_column();

-- =============================================================================
-- RLS Policies
-- =============================================================================
-- Jobs are customer-scoped. Users can see/manage jobs for their customer.
-- System admins and customer success can access all jobs they have permission for.

alter table public.llm_jobs enable row level security;

create policy llm_jobs_select_own
  on public.llm_jobs
  for select to authenticated
  using (public.can_access_customer(customer_id));

create policy llm_jobs_insert_own
  on public.llm_jobs
  for insert to authenticated
  with check (public.can_access_customer(customer_id));

create policy llm_jobs_update_own
  on public.llm_jobs
  for update to authenticated
  using (public.can_access_customer(customer_id))
  with check (public.can_access_customer(customer_id));

-- Note: Jobs are generally not deleted, but cancel is an update to status.
-- Allow delete only for system admins (cleanup/GDPR).
create policy llm_jobs_delete_system_admin
  on public.llm_jobs
  for delete to authenticated
  using (public.is_system_admin());

-- =============================================================================
-- Realtime: Enable for live status updates
-- =============================================================================
-- RLS policies ensure customers only receive updates for their own jobs.

alter publication supabase_realtime add table public.llm_jobs;

comment on table public.llm_jobs is
  'Tracks LLM query jobs through their lifecycle. Realtime enabled for live status updates.';