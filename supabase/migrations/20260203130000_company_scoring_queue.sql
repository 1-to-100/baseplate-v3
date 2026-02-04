-- =============================================================================
-- Migration: Company scoring queue table and pg_cron worker trigger
-- Description: Table-backed queue for company scoring; cron calls worker Edge Function every 5 min
-- =============================================================================

-- Enum: queue job status
create type public.company_scoring_queue_status as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

comment on type public.company_scoring_queue_status is
  'Status of a company scoring queue job';

-- Table: company_scoring_queue
create table public.company_scoring_queue (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  company_id uuid not null,
  status public.company_scoring_queue_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  error_message text,

  constraint company_scoring_queue_customer_id_fkey
    foreign key (customer_id) references public.customers(customer_id) on delete cascade,
  constraint company_scoring_queue_company_id_fkey
    foreign key (company_id) references public.companies(company_id) on delete cascade,
  constraint company_scoring_queue_unique unique (customer_id, company_id)
);

comment on table public.company_scoring_queue is
  'Queue of company scoring jobs; worker Edge Function processes pending rows by invoking company-scoring';

comment on column public.company_scoring_queue.status is
  'Job status (company_scoring_queue_status enum)';

create index company_scoring_queue_pending_idx
  on public.company_scoring_queue(created_at)
  where status = 'pending';

-- RLS
alter table public.company_scoring_queue enable row level security;

create policy "Service role can manage company_scoring_queue"
  on public.company_scoring_queue
  for all
  to service_role
  using (true)
  with check (true);

-- Function: call company-scoring-worker Edge Function (invoked by pg_cron)
create or replace function process_company_scoring_queue()
returns void
language plpgsql
security definer
as $$
declare
  request_id bigint;
  functions_url text;
  service_key text;
begin
  begin
    functions_url := current_setting('app.supabase_functions_url', true);
    service_key := current_setting('app.service_role_key', true);
  exception
    when others then
      raise warning 'Configuration not found. Set app.supabase_functions_url and app.service_role_key';
      return;
  end;

  if functions_url is null or service_key is null then
    raise warning 'Missing configuration: app.supabase_functions_url or app.service_role_key';
    return;
  end if;

  select net.http_post(
    url := functions_url || '/company-scoring-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) into request_id;

  raise log 'Queued company scoring worker run, request_id: %', request_id;
end;
$$;

comment on function process_company_scoring_queue() is
  'Calls the company-scoring-worker Edge Function to process pending queue rows';

-- Atomic claim: worker calls this to claim up to N pending rows
create or replace function claim_company_scoring_jobs(claim_limit int default 20)
returns setof public.company_scoring_queue
language sql
security definer
as $$
  update public.company_scoring_queue
  set status = 'processing', updated_at = now()
  where id in (
    select id from public.company_scoring_queue
    where status = 'pending'
    order by created_at asc
    limit claim_limit
  )
  returning id, customer_id, company_id, status, created_at, updated_at, error_message;
$$;

comment on function claim_company_scoring_jobs(int) is
  'Claims up to claim_limit pending rows for processing; returns claimed rows';

-- Schedule cron: every 5 minutes
do $$
begin
  perform cron.unschedule('process-company-scoring-queue');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'process-company-scoring-queue',
  '*/5 * * * *',
  'select process_company_scoring_queue();'
);
