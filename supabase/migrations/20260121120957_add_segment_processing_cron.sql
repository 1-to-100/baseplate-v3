-- =============================================================================
-- Migration: Add pg_cron job for segment background processing
-- Description: Sets up automatic processing of segments with status 'new'
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create function to process pending segments
CREATE OR REPLACE FUNCTION process_pending_segments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  segment_record RECORD;
  request_id bigint;
  functions_url text;
  service_key text;
BEGIN
  -- Get configuration from environment (these should be set in Supabase dashboard)
  -- For local development: http://host.docker.internal:54321/functions/v1
  -- For production: https://[project-ref].supabase.co/functions/v1
  BEGIN
    functions_url := current_setting('app.supabase_functions_url', true);
    service_key := current_setting('app.service_role_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Configuration not found. Set app.supabase_functions_url and app.service_role_key';
      RETURN;
  END;

  IF functions_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Missing configuration: app.supabase_functions_url or app.service_role_key';
    RETURN;
  END IF;

  -- Find all segments with status 'new' and process them
  FOR segment_record IN 
    SELECT list_id, customer_id, name
    FROM public.lists
    WHERE status = 'new'
      AND list_type = 'segment'
      AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 10  -- Process max 10 segments per run to avoid overwhelming the system
  LOOP
    -- Call edge function via HTTP POST using pg_net
    SELECT net.http_post(
      url := functions_url || '/segments-process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'segment_id', segment_record.list_id,
        'customer_id', segment_record.customer_id
      ),
      timeout_milliseconds := 300000  -- 5 minute timeout
    ) INTO request_id;

    RAISE LOG 'Queued segment processing for segment_id: %, request_id: %', 
              segment_record.list_id, request_id;
  END LOOP;
END;
$$;

-- Add comment
COMMENT ON FUNCTION process_pending_segments() IS 
  'Processes pending segments by calling the segments-process edge function via HTTP';

-- Schedule cron job to run every 1 minute
-- Note: cron.schedule returns bigint (job ID), but we don't need to store it
DO $$
DECLARE
  job_id bigint;
BEGIN
  -- First, unschedule if it exists (for idempotency)
  PERFORM cron.unschedule('process-pending-segments');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore error if job doesn't exist
    NULL;
END $$;

SELECT cron.schedule(
  'process-pending-segments',  -- job name
  '* * * * *',                  -- cron expression: every minute
  'SELECT process_pending_segments();'  -- SQL to execute
);

-- Create a table to track cron job history (optional but useful for debugging)
CREATE TABLE IF NOT EXISTS public.segment_processing_log (
  log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL,
  status text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.segment_processing_log IS 
  'Logs segment processing attempts for debugging';

-- Grant permissions on the log table
ALTER TABLE public.segment_processing_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for system access only
CREATE POLICY "System can manage segment processing logs"
  ON public.segment_processing_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify the cron job was created
DO $$
BEGIN
  RAISE NOTICE 'Segment processing cron job has been set up. Job will run every minute.';
  RAISE NOTICE 'Configure app.supabase_functions_url and app.service_role_key in Supabase dashboard:';
  RAISE NOTICE '  ALTER DATABASE postgres SET app.supabase_functions_url = ''your_functions_url'';';
  RAISE NOTICE '  ALTER DATABASE postgres SET app.service_role_key = ''your_service_role_key'';';
END $$;
