-- =============================================================================
-- Migration: Add pg_cron schedule to invoke llm-worker every 60 seconds
-- =============================================================================
-- The llm-worker edge function is invoked via fire-and-forget when a job is
-- created, but this can fail silently. The watchdog rescues stuck jobs by
-- setting them back to 'retrying', but nothing picks up retrying jobs without
-- a scheduled worker invocation. This cron job closes that gap by sweeping
-- for any queued or retrying jobs every 60 seconds.
--
-- Prerequisites:
--   Three vault secrets must be configured in your Supabase project:
--
--   1. project_url          - Your project's API URL (e.g. https://<ref>.supabase.co)
--                             Falls back to http://kong:8000 for local Docker networking
--   2. service_role_key     - Your project's service role key (for Supabase gateway auth)
--   3. queue_secret          - Shared secret for internal queue auth
--                             (must match QUEUE_SECRET env var on edge functions)
--
--   To set these via SQL:
--     select vault.create_secret('<your-url>', 'project_url');
--     select vault.create_secret('<your-key>', 'service_role_key');
--     select vault.create_secret('<your-secret>', 'queue_secret');
--
--   Or via the Supabase Dashboard: Settings > Vault
-- =============================================================================

-- Enable pg_net for HTTP requests from within PostgreSQL
create extension if not exists pg_net with schema extensions;

-- Schedule worker invocation every 60 seconds
select cron.schedule(
  'llm-worker-sweep',
  '* * * * *',  -- Every 60 seconds
  $$
  select extensions.http_post(
    url    := coalesce(
                (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
                'http://kong:8000'
              ) || '/functions/v1/llm-worker',
    body   := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
      'x-queue-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'queue_secret' limit 1)
    )
  )
  $$
);

-- llm-worker-sweep: Invokes llm-worker every 60s to process queued pgmq messages
