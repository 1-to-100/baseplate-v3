-- =============================================================================
-- Migration: Fix pg_net schema reference and drop legacy JWT gateway auth
-- =============================================================================
-- Fixes three issues in the original migrations:
--
--   1. extensions.http_post() → net.http_post()
--      pg_net exposes functions in the `net` schema, not `extensions`
--
--   2. Adds x-queue-secret header to cron and DLQ replay calls
--      Internal queue auth now uses a dedicated shared secret (queue_secret)
--
--   3. Removes Authorization: Bearer <service_role_key> header
--      Legacy JWT verification is deprecated at the gateway level.
--      Edge functions use verify_jwt = false and handle auth internally
--      via the x-queue-secret header.
--
-- Vault prerequisites:
--   - project_url       : Project API URL
--   - queue_secret      : Shared secret for queue auth (must match QUEUE_SECRET env var)
-- =============================================================================

-- 1. Recreate the cron job with net.http_post and x-queue-secret header
select cron.unschedule('llm-worker-sweep');

select cron.schedule(
  'llm-worker-sweep',
  '* * * * *',
  $$
  select net.http_post(
    url    := coalesce(
                (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
                'http://kong:8000'
              ) || '/functions/v1/llm-worker',
    body   := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-queue-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'queue_secret' limit 1)
    )
  )
  $$
);

-- 2. Replace llm_process_dlq with net.http_post and x-queue-secret header
CREATE OR REPLACE FUNCTION public.llm_process_dlq()
RETURNS TABLE(dlq_id uuid, job_id uuid, action text, next_retry_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
declare
  item record;
  v_job_status text;
  v_backoff_seconds int;
  v_next_retry timestamptz;
  v_project_url text;
  v_queue_secret text;
begin
  select decrypted_secret into v_project_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_queue_secret
    from vault.decrypted_secrets where name = 'queue_secret' limit 1;

  if v_project_url is null or char_length(trim(v_project_url)) = 0 then
    v_project_url := 'http://kong:8000';
  end if;

  if v_queue_secret is null then
    raise warning 'DLQ processor: vault secret queue_secret not configured';
    return;
  end if;

  for item in
    select d.* from public.llm_dead_letter_queue d
    where d.status = 'pending'
      and d.next_retry_at <= current_timestamp
    order by d.next_retry_at
    for update skip locked
    limit 10
  loop
    select j.status into v_job_status
      from public.llm_jobs j
      where j.id = item.job_id;

    if v_job_status is null or v_job_status not in ('waiting_llm', 'running') then
      update public.llm_dead_letter_queue
      set
        status = 'resolved',
        resolved_at = current_timestamp,
        updated_at = current_timestamp
      where id = item.id;

      dlq_id := item.id;
      job_id := item.job_id;
      action := 'resolved_stale';
      next_retry_at := null;
      return next;
      continue;
    end if;

    update public.llm_dead_letter_queue
    set status = 'processing', updated_at = current_timestamp
    where id = item.id;

    if item.retry_count >= item.max_retries then
      update public.llm_dead_letter_queue
      set
        status = 'exhausted',
        resolved_at = current_timestamp,
        updated_at = current_timestamp
      where id = item.id;

      update public.llm_jobs
      set
        status = 'exhausted',
        error_message = 'DLQ exhausted after ' || item.max_retries || ' retries: ' || item.error_message,
        completed_at = current_timestamp,
        updated_at = current_timestamp
      where id = item.job_id
        and status in ('waiting_llm', 'running');

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
      v_backoff_seconds := least(power(2, item.retry_count)::int * 60, 3600);
      v_next_retry := current_timestamp + (v_backoff_seconds || ' seconds')::interval;

      perform net.http_post(
        url    := v_project_url || '/functions/v1/llm-webhook?source=dlq',
        body   := jsonb_build_object(
          'dlq_id', item.id,
          'webhook_payload', item.webhook_payload,
          'provider_slug', item.provider_slug
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-queue-secret', v_queue_secret
        )
      );

      update public.llm_dead_letter_queue
      set
        status = 'pending',
        retry_count = item.retry_count + 1,
        next_retry_at = v_next_retry,
        updated_at = current_timestamp
      where id = item.id;

      dlq_id := item.id;
      job_id := item.job_id;
      action := 'replay_dispatched';
      next_retry_at := v_next_retry;
      return next;
    end if;
  end loop;
end;
$fn$;
