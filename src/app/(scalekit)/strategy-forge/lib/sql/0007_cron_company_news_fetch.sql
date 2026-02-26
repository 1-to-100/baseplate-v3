-- =============================================================================
-- Migration: Schedule company-news-fetch Edge Function via pg_cron
-- Description: Runs daily at 3 AM UTC to fetch news for companies with stale
--              or missing news_last_fetched_at. Uses Vault for config.
-- Requires: Secrets named 'supabase_functions_url' and 'supabase_service_role_key'
--           in Project Settings → Vault (same as company-scoring-worker).
-- =============================================================================

-- Function: call company-news-fetch Edge Function (invoked by pg_cron)
create or replace function process_company_news_fetch()
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
    url := rtrim(functions_url, '/') || '/company-news-fetch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{"limit": 10}'::jsonb,  -- TODO: revert to '{}' after testing
    timeout_milliseconds := 600000  -- 10 minutes (longer timeout for processing all companies)
  ) into request_id;

  raise log 'Queued company news fetch run, request_id: %', request_id;
end;
$$;

comment on function process_company_news_fetch() is
  'Calls the company-news-fetch Edge Function to fetch news for companies with stale/missing news';

-- Unschedule if exists (idempotent)
do $$
begin
  perform cron.unschedule('fetch-company-news-daily');
exception
  when others then
    null;
end $$;

-- Schedule cron: every day at 3 AM UTC
select cron.schedule(
  'fetch-company-news-daily',
  '0 3 * * *',
  'select process_company_news_fetch();'
);
