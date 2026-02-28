-- =============================================================================
-- Migration: Company scoring queue + pg_cron using Vault
-- Description: Table-backed queue for company scoring; cron calls worker Edge
--              Function every day at midnight. Config (functions URL, service key) is
--              read from Supabase Vault so app settings are not required.
-- Requires: Secrets named 'supabase_functions_url' and 'supabase_service_role_key'
--           in Project Settings → Vault.
-- =============================================================================

-- Enum: queue job status (idempotent)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'company_scoring_queue_status') then
    create type public.company_scoring_queue_status as enum (
      'pending',
      'processing',
      'completed',
      'failed'
    );
  end if;
end $$;

comment on type public.company_scoring_queue_status is
  'Status of a company scoring queue job';

-- Table: company_scoring_queue (idempotent)
create table if not exists public.company_scoring_queue (
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

create index if not exists company_scoring_queue_pending_idx
  on public.company_scoring_queue(created_at)
  where status = 'pending';

-- RLS (idempotent)
alter table public.company_scoring_queue enable row level security;

drop policy if exists "Service role can manage company_scoring_queue" on public.company_scoring_queue;
create policy "Service role can manage company_scoring_queue"
  on public.company_scoring_queue
  for all
  to service_role
  using (true)
  with check (true);

-- Helper: read Edge Function URL and service key from Vault (for use by cron only).
create or replace function public.get_supabase_cron_config()
returns table(functions_url text, service_key text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_functions_url' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_service_role_key' limit 1);
end;
$$;

comment on function public.get_supabase_cron_config() is
  'Returns functions URL and service role key from Vault for pg_cron to call Edge Functions. Do not expose to app clients.';

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
  config record;
begin
  select * into config from public.get_supabase_cron_config() limit 1;
  functions_url := config.functions_url;
  service_key := config.service_key;

  if functions_url is null or service_key is null then
    raise warning 'Cron config missing. Add supabase_functions_url and supabase_service_role_key to Vault (Project Settings → Vault).';
    return;
  end if;

  select net.http_post(
    url := rtrim(functions_url, '/') || '/company-scoring-worker',
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

-- Schedule cron: every day at midnight (00:00 UTC)
do $$
begin
  perform cron.unschedule('process-company-scoring-queue');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'process-company-scoring-queue',
  '0 0 * * *',
  'select process_company_scoring_queue();'
);

-- Segment processing: use Vault instead of app settings
create or replace function process_pending_segments()
returns void
language plpgsql
security definer
as $$
declare
  segment_record record;
  request_id bigint;
  functions_url text;
  service_key text;
  config record;
begin
  select * into config from public.get_supabase_cron_config() limit 1;
  functions_url := config.functions_url;
  service_key := config.service_key;

  if functions_url is null or service_key is null then
    raise warning 'Cron config missing. Add supabase_functions_url and supabase_service_role_key to Vault (Project Settings → Vault).';
    return;
  end if;

  for segment_record in
    select list_id, customer_id, name
    from public.lists
    where status = 'new'
      and list_type = 'segment'
      and deleted_at is null
    order by created_at asc
    limit 10
  loop
    select net.http_post(
      url := rtrim(functions_url, '/') || '/segments-process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'segment_id', segment_record.list_id,
        'customer_id', segment_record.customer_id
      ),
      timeout_milliseconds := 300000
    ) into request_id;

    raise log 'Queued segment processing for segment_id: %, request_id: %',
              segment_record.list_id, request_id;
  end loop;
end;
$$;
