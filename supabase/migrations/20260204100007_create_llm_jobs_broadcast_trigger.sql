-- Broadcast trigger for real-time llm_jobs table changes
-- Uses Supabase Realtime's Broadcast from Database pattern via realtime.send()
-- with private channels and RLS-based authorization.
--
-- Each change broadcasts to a customer-scoped topic: 'llm-jobs:{customer_id}'
-- RLS on realtime.messages uses can_access_customer() to enforce that only
-- users with access to that customer can subscribe to the topic.
-- When the UI switches customer context, the client tears down the old
-- subscription and creates a new one for the new customer automatically.
--
-- This avoids the known local-dev issue with postgres_changes (GitHub #21624).

-- Trigger function that broadcasts job changes to the customer-scoped topic
CREATE OR REPLACE FUNCTION public.broadcast_llm_jobs_changes()
RETURNS trigger
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);

  PERFORM realtime.send(
    jsonb_build_object('type', TG_OP, 'table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA),
    TG_OP,
    'llm-jobs:' || v_customer_id::text,
    true  -- private channel, requires authenticated subscription
  );

  RETURN NULL;
END;
$$;

-- Trigger on llm_jobs for INSERT, UPDATE, DELETE
CREATE TRIGGER broadcast_llm_jobs_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.llm_jobs
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_llm_jobs_changes();

-- RLS policy: only users who can access the customer can subscribe
CREATE POLICY "llm_jobs_broadcast_customer"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND realtime.topic() LIKE 'llm-jobs:%'
  AND public.can_access_customer(substring(realtime.topic() FROM 'llm-jobs:(.+)')::uuid)
);
