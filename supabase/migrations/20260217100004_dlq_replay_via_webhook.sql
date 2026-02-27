-- =============================================================================
-- Migration: H2 — DLQ replays webhook instead of re-submitting LLM request
-- =============================================================================
-- Previously, llm_process_dlq() set the job to 'retrying', which caused the
-- worker to submit a brand new LLM request — wasting the already-completed
-- response and its tokens.
--
-- Now the DLQ processor calls the webhook handler via pg_net with the stored
-- webhook payload, preserving the original LLM response.
--
-- Also adds status guard (M1): only processes DLQ entries where the job is
-- still in 'waiting_llm' status. If the job has moved on, the entry is resolved.
-- =============================================================================

-- Replace llm_process_dlq with webhook-replay version
create or replace function public.llm_process_dlq()
returns table (
  dlq_id uuid,
  job_id uuid,
  action text,
  next_retry_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  v_job_status text;
  v_backoff_seconds int;
  v_next_retry timestamptz;
  v_project_url text;
  v_service_role_key text;
  v_queue_secret text;
begin
  -- Resolve vault secrets once per invocation
  select decrypted_secret into v_project_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_service_role_key
    from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  select decrypted_secret into v_queue_secret
    from vault.decrypted_secrets where name = 'queue_secret' limit 1;

  -- Default to kong:8000 for local Docker networking
  if v_project_url is null or char_length(trim(v_project_url)) = 0 then
    v_project_url := 'http://kong:8000';
  end if;

  if v_service_role_key is null or v_queue_secret is null then
    raise warning 'DLQ processor: vault secrets service_role_key/queue_secret not configured';
    return;
  end if;

  -- Process pending items ready for retry
  for item in
    select d.* from public.llm_dead_letter_queue d
    where d.status = 'pending'
      and d.next_retry_at <= current_timestamp
    order by d.next_retry_at
    for update skip locked
    limit 10
  loop
    -- M1 status guard: check if job is still in a processable state
    select j.status into v_job_status
      from public.llm_jobs j
      where j.id = item.job_id;

    if v_job_status is null or v_job_status not in ('waiting_llm', 'running') then
      -- Job has moved on (completed, cancelled, etc.) — resolve the DLQ entry
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

      -- Mark associated job as exhausted (with status guard)
      update public.llm_jobs
      set
        status = 'exhausted',
        error_message = 'DLQ exhausted after ' || item.max_retries || ' retries: ' || item.error_message,
        completed_at = current_timestamp,
        updated_at = current_timestamp
      where id = item.job_id
        and status in ('waiting_llm', 'running');

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

      -- Replay webhook via pg_net (fire-and-forget)
      perform extensions.http_post(
        url    := v_project_url || '/functions/v1/llm-webhook?source=dlq',
        body   := jsonb_build_object(
          'dlq_id', item.id,
          'webhook_payload', item.webhook_payload,
          'provider_slug', item.provider_slug
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key,
          'x-queue-secret', v_queue_secret
        )
      );

      -- Schedule next retry (in case the replay fails)
      update public.llm_dead_letter_queue
      set
        status = 'pending',
        retry_count = item.retry_count + 1,
        next_retry_at = v_next_retry,
        updated_at = current_timestamp
      where id = item.id;

      -- Do NOT set job to 'retrying' — job stays in waiting_llm
      -- The webhook handler will complete/fail the job on replay

      dlq_id := item.id;
      job_id := item.job_id;
      action := 'replay_dispatched';
      next_retry_at := v_next_retry;
      return next;
    end if;
  end loop;
end;
$$;

comment on function public.llm_process_dlq() is
  'Processes DLQ entries by replaying webhook payloads via pg_net. Includes M1 status guard.';
