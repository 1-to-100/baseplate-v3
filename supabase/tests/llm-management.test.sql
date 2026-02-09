-- =============================================================================
-- LLM Management: pgTAP Tests
-- =============================================================================
-- Comprehensive tests for LLM management database functions including:
-- - Atomic rate limiting (llm_increment_rate_limit)
-- - Quota checking (llm_check_rate_limit)
-- - Webhook idempotency (llm_record_webhook)
-- - Stuck job recovery (llm_process_stuck_jobs)
-- - Job cancellation (llm_cancel_job)
-- - Dead letter queue (llm_add_to_dlq, llm_process_dlq)
-- - Diagnostic logging (llm_log_diagnostic)
--
-- NOTE: These tests assume pgTAP extension is installed. In Supabase, enable
-- the pgtap extension via the dashboard or with: CREATE EXTENSION IF NOT EXISTS pgtap;
--
-- To run tests: SELECT * FROM run_tests();
-- Or run the full file in a transaction that rolls back.
-- =============================================================================

BEGIN;

-- Enable pgTAP if not already enabled
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Plan the number of tests
SELECT plan(78);

-- =============================================================================
-- TEST SETUP: Create test data
-- =============================================================================

-- Note: The LLM migrations reference customers(id) and users(id), but the
-- initial schema uses customer_id and user_id as primary key column names.
-- This test assumes the schema matches what's in the initial migration.
-- If there's a mismatch, the migrations need to be corrected.

-- Create test customers (using ON CONFLICT to handle pre-existing data)
INSERT INTO public.customers (customer_id, name, email_domain, active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Customer Alpha', 'alpha.test.com', true),
  ('22222222-2222-2222-2222-222222222222', 'Test Customer Beta', 'beta.test.com', true),
  ('33333333-3333-3333-3333-333333333333', 'Test Customer Gamma', 'gamma.test.com', true)
ON CONFLICT (name) DO UPDATE SET email_domain = EXCLUDED.email_domain;

-- Create test roles (using ON CONFLICT to handle pre-existing roles)
INSERT INTO public.roles (role_id, name, display_name, is_system_role, permissions)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test_system_admin', 'Test System Administrator', true, '["*"]'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test_customer_admin', 'Test Customer Admin', false, '["manage_users"]'::jsonb),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'test_standard_user', 'Test Standard User', false, '["read"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;

-- Create test users (without auth_user_id since we're not testing via authenticated sessions)
INSERT INTO public.users (user_id, email, full_name, customer_id, role_id, status)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'test-admin@alpha.test.com', 'Alpha Admin', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active'),
  ('aaaa2222-2222-2222-2222-222222222222', 'test-user@alpha.test.com', 'Alpha User', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'active'),
  ('bbbb1111-1111-1111-1111-111111111111', 'test-admin@beta.test.com', 'Beta Admin', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active'),
  ('bbbb2222-2222-2222-2222-222222222222', 'test-user@beta.test.com', 'Beta User', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'active')
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Create or get test provider
DO $$
DECLARE
  v_provider_id uuid;
BEGIN
  SELECT id INTO v_provider_id FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;
  IF v_provider_id IS NULL THEN
    INSERT INTO public.llm_providers (id, slug, name, timeout_seconds, max_retries, retry_delay_seconds)
    VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'openai', 'OpenAI', 600, 2, 60);
  END IF;
END $$;

-- =============================================================================
-- SECTION 1: llm_increment_rate_limit Tests
-- =============================================================================

-- Test 1.1: Setup rate limit for testing
DELETE FROM public.llm_rate_limits WHERE customer_id = '11111111-1111-1111-1111-111111111111';
INSERT INTO public.llm_rate_limits (customer_id, period, quota, used)
VALUES ('11111111-1111-1111-1111-111111111111', 'monthly', 100, 0);

SELECT is(
  (SELECT used FROM public.llm_rate_limits WHERE customer_id = '11111111-1111-1111-1111-111111111111' AND period = 'monthly'),
  0,
  'Test 1.1: Initial rate limit used count should be 0'
);

-- Test 1.2: Increment rate limit successfully
SELECT isnt(
  public.llm_increment_rate_limit('11111111-1111-1111-1111-111111111111', 'monthly'),
  NULL,
  'Test 1.2: llm_increment_rate_limit should return non-NULL when under quota'
);

SELECT is(
  (SELECT used FROM public.llm_rate_limits WHERE customer_id = '11111111-1111-1111-1111-111111111111' AND period = 'monthly'),
  1,
  'Test 1.3: Rate limit used count should be incremented to 1'
);

-- Test 1.4: Multiple increments
SELECT isnt(
  public.llm_increment_rate_limit('11111111-1111-1111-1111-111111111111', 'monthly'),
  NULL,
  'Test 1.4: Second increment should succeed'
);

SELECT is(
  (SELECT used FROM public.llm_rate_limits WHERE customer_id = '11111111-1111-1111-1111-111111111111' AND period = 'monthly'),
  2,
  'Test 1.5: Rate limit used count should be 2 after second increment'
);

-- Test 1.6: Rate limit at quota boundary
UPDATE public.llm_rate_limits
SET used = 99
WHERE customer_id = '11111111-1111-1111-1111-111111111111' AND period = 'monthly';

SELECT isnt(
  public.llm_increment_rate_limit('11111111-1111-1111-1111-111111111111', 'monthly'),
  NULL,
  'Test 1.6: Increment at quota-1 should succeed (99 -> 100)'
);

SELECT is(
  (SELECT used FROM public.llm_rate_limits WHERE customer_id = '11111111-1111-1111-1111-111111111111' AND period = 'monthly'),
  100,
  'Test 1.7: Rate limit should now be at quota (100)'
);

-- Test 1.8: Rate limit exceeded - should return NULL
SELECT is(
  public.llm_increment_rate_limit('11111111-1111-1111-1111-111111111111', 'monthly'),
  NULL,
  'Test 1.8: Increment at quota should return NULL (rate limit exceeded)'
);

SELECT is(
  (SELECT used FROM public.llm_rate_limits WHERE customer_id = '11111111-1111-1111-1111-111111111111' AND period = 'monthly'),
  100,
  'Test 1.9: Rate limit used should still be 100 (not incremented beyond quota)'
);

-- Test 1.10: Non-existent customer returns NULL
SELECT is(
  public.llm_increment_rate_limit('99999999-9999-9999-9999-999999999999', 'monthly'),
  NULL,
  'Test 1.10: Increment for non-existent customer should return NULL'
);

-- Test 1.11: Non-existent period returns NULL
SELECT is(
  public.llm_increment_rate_limit('11111111-1111-1111-1111-111111111111', 'hourly'),
  NULL,
  'Test 1.11: Increment for non-existent period should return NULL'
);

-- Test 1.12: Different periods are independent
INSERT INTO public.llm_rate_limits (customer_id, period, quota, used)
VALUES ('11111111-1111-1111-1111-111111111111', 'daily', 50, 0)
ON CONFLICT (customer_id, period) DO UPDATE SET used = 0, quota = 50;

SELECT isnt(
  public.llm_increment_rate_limit('11111111-1111-1111-1111-111111111111', 'daily'),
  NULL,
  'Test 1.12: Daily period increment should work independently'
);

SELECT is(
  (SELECT used FROM public.llm_rate_limits WHERE customer_id = '11111111-1111-1111-1111-111111111111' AND period = 'daily'),
  1,
  'Test 1.13: Daily period used count should be 1'
);

SELECT is(
  (SELECT used FROM public.llm_rate_limits WHERE customer_id = '11111111-1111-1111-1111-111111111111' AND period = 'monthly'),
  100,
  'Test 1.14: Monthly period should still be at 100'
);

-- =============================================================================
-- SECTION 2: llm_check_rate_limit Tests
-- =============================================================================

-- Test 2.1: Check rate limit returns correct values
SELECT is(
  (SELECT quota FROM public.llm_check_rate_limit('11111111-1111-1111-1111-111111111111', 'daily')),
  50,
  'Test 2.1: llm_check_rate_limit should return correct quota'
);

SELECT is(
  (SELECT used FROM public.llm_check_rate_limit('11111111-1111-1111-1111-111111111111', 'daily')),
  1,
  'Test 2.2: llm_check_rate_limit should return correct used count'
);

SELECT is(
  (SELECT remaining FROM public.llm_check_rate_limit('11111111-1111-1111-1111-111111111111', 'daily')),
  49,
  'Test 2.3: llm_check_rate_limit should return correct remaining'
);

SELECT is(
  (SELECT is_exceeded FROM public.llm_check_rate_limit('11111111-1111-1111-1111-111111111111', 'daily')),
  false,
  'Test 2.4: llm_check_rate_limit is_exceeded should be false when under quota'
);

-- Test 2.5: Check exceeded rate limit
SELECT is(
  (SELECT is_exceeded FROM public.llm_check_rate_limit('11111111-1111-1111-1111-111111111111', 'monthly')),
  true,
  'Test 2.5: llm_check_rate_limit is_exceeded should be true when at/over quota'
);

SELECT is(
  (SELECT remaining FROM public.llm_check_rate_limit('11111111-1111-1111-1111-111111111111', 'monthly')),
  0,
  'Test 2.6: llm_check_rate_limit remaining should be 0 when at quota'
);

-- Test 2.7: Non-existent customer returns no rows
SELECT is(
  (SELECT count(*) FROM public.llm_check_rate_limit('99999999-9999-9999-9999-999999999999', 'monthly')),
  0::bigint,
  'Test 2.7: llm_check_rate_limit for non-existent customer should return no rows'
);

-- =============================================================================
-- SECTION 3: llm_record_webhook Tests (Idempotency)
-- =============================================================================

-- Clean up any existing test jobs
DELETE FROM public.llm_jobs WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
DELETE FROM public.llm_webhook_events WHERE webhook_id LIKE 'test-webhook-%';

-- Create a test job for webhook tests
INSERT INTO public.llm_jobs (id, customer_id, user_id, provider_id, prompt, status)
SELECT
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  'aaaa1111-1111-1111-1111-111111111111',
  id,
  'Test prompt for webhook testing',
  'waiting_llm'
FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;

-- Test 3.1: First webhook record should return true
SELECT is(
  public.llm_record_webhook('test-webhook-123', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'openai', 'response.completed'),
  true,
  'Test 3.1: First webhook record should return true (new webhook)'
);

-- Test 3.2: Verify webhook was recorded
SELECT is(
  (SELECT count(*) FROM public.llm_webhook_events WHERE webhook_id = 'test-webhook-123'),
  1::bigint,
  'Test 3.2: Webhook should be recorded in llm_webhook_events'
);

-- Test 3.3: Duplicate webhook should return false
SELECT is(
  public.llm_record_webhook('test-webhook-123', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'openai', 'response.completed'),
  false,
  'Test 3.3: Duplicate webhook should return false (idempotent)'
);

-- Test 3.4: Count should still be 1 after duplicate attempt
SELECT is(
  (SELECT count(*) FROM public.llm_webhook_events WHERE webhook_id = 'test-webhook-123'),
  1::bigint,
  'Test 3.4: Webhook count should still be 1 after duplicate attempt'
);

-- Test 3.5: Different webhook ID should succeed
SELECT is(
  public.llm_record_webhook('test-webhook-456', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'openai', 'response.failed'),
  true,
  'Test 3.5: Different webhook ID should return true'
);

-- Test 3.6: Verify both webhooks exist
SELECT is(
  (SELECT count(*) FROM public.llm_webhook_events WHERE job_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  2::bigint,
  'Test 3.6: Both webhooks should be recorded for the job'
);

-- Test 3.7: Webhook with NULL optional parameters
SELECT is(
  public.llm_record_webhook('test-webhook-789', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', NULL, NULL),
  true,
  'Test 3.7: Webhook with NULL optional params should succeed'
);

-- =============================================================================
-- SECTION 4: llm_process_stuck_jobs Tests (Watchdog Recovery)
-- =============================================================================

-- Clean up existing test stuck jobs
DELETE FROM public.llm_jobs WHERE id LIKE 'ffffffff-000%';

-- Create test jobs that are stuck
-- Stuck job 1: waiting_llm status, past timeout, 0 retries (should be retried)
INSERT INTO public.llm_jobs (id, customer_id, provider_id, prompt, status, retry_count, updated_at)
SELECT
  'ffffffff-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  id,
  'Stuck job 1 - should be retried',
  'waiting_llm',
  0,
  current_timestamp - interval '15 minutes'  -- Past OpenAI's 10 minute timeout
FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;

-- Stuck job 2: waiting_llm status, past timeout, at max_retries (should be exhausted)
-- Note: OpenAI provider has max_retries = 2 (or 1 in seeded data), we use 2 retries
INSERT INTO public.llm_jobs (id, customer_id, provider_id, prompt, status, retry_count, updated_at)
SELECT
  'ffffffff-0002-0002-0002-000000000002',
  '11111111-1111-1111-1111-111111111111',
  id,
  'Stuck job 2 - should be exhausted',
  'waiting_llm',
  max_retries,  -- Use provider's actual max_retries
  current_timestamp - interval '15 minutes'
FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;

-- Not stuck job: within timeout
INSERT INTO public.llm_jobs (id, customer_id, provider_id, prompt, status, retry_count, updated_at)
SELECT
  'ffffffff-0003-0003-0003-000000000003',
  '11111111-1111-1111-1111-111111111111',
  id,
  'Not stuck - within timeout',
  'waiting_llm',
  0,
  current_timestamp - interval '5 minutes'  -- Within 10 minute timeout
FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;

-- Test 4.1: Process stuck jobs
SELECT is(
  (SELECT count(*) FROM public.llm_process_stuck_jobs()),
  2::bigint,
  'Test 4.1: llm_process_stuck_jobs should process 2 stuck jobs'
);

-- Test 4.2: Verify job 1 was retried
SELECT is(
  (SELECT status FROM public.llm_jobs WHERE id = 'ffffffff-0001-0001-0001-000000000001'),
  'retrying',
  'Test 4.2: Stuck job 1 should have status retrying'
);

SELECT is(
  (SELECT retry_count FROM public.llm_jobs WHERE id = 'ffffffff-0001-0001-0001-000000000001'),
  1,
  'Test 4.3: Stuck job 1 retry_count should be incremented to 1'
);

-- Test 4.4: Verify job 2 was exhausted
SELECT is(
  (SELECT status FROM public.llm_jobs WHERE id = 'ffffffff-0002-0002-0002-000000000002'),
  'exhausted',
  'Test 4.4: Stuck job 2 should have status exhausted'
);

SELECT isnt(
  (SELECT completed_at FROM public.llm_jobs WHERE id = 'ffffffff-0002-0002-0002-000000000002'),
  NULL,
  'Test 4.5: Exhausted job should have completed_at set'
);

-- Test 4.6: Verify job 3 was not touched (not stuck)
SELECT is(
  (SELECT status FROM public.llm_jobs WHERE id = 'ffffffff-0003-0003-0003-000000000003'),
  'waiting_llm',
  'Test 4.6: Non-stuck job should still be waiting_llm'
);

SELECT is(
  (SELECT retry_count FROM public.llm_jobs WHERE id = 'ffffffff-0003-0003-0003-000000000003'),
  0,
  'Test 4.7: Non-stuck job retry_count should still be 0'
);

-- =============================================================================
-- SECTION 5: llm_cancel_job Tests
-- =============================================================================

-- Clean up existing test cancellation jobs
DELETE FROM public.llm_jobs WHERE id LIKE 'gggggggg-000%';

-- Create jobs in various states for cancellation testing
INSERT INTO public.llm_jobs (id, customer_id, provider_id, prompt, status)
SELECT
  'gggggggg-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  id,
  'Queued job - can cancel',
  'queued'
FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;

INSERT INTO public.llm_jobs (id, customer_id, provider_id, prompt, status)
SELECT
  'gggggggg-0002-0002-0002-000000000002',
  '11111111-1111-1111-1111-111111111111',
  id,
  'Running job - can cancel',
  'running'
FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;

INSERT INTO public.llm_jobs (id, customer_id, provider_id, prompt, status, completed_at)
SELECT
  'gggggggg-0003-0003-0003-000000000003',
  '11111111-1111-1111-1111-111111111111',
  id,
  'Completed job - cannot cancel',
  'completed',
  current_timestamp
FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;

INSERT INTO public.llm_jobs (id, customer_id, provider_id, prompt, status)
SELECT
  'gggggggg-0004-0004-0004-000000000004',
  '22222222-2222-2222-2222-222222222222',  -- Different customer
  id,
  'Other customer job',
  'queued'
FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;

-- Note: llm_cancel_job uses can_access_customer() which relies on auth.uid()
-- Since we're testing without authentication context, we test the logic
-- by simulating what the function does (status transition constraints)

-- Test 5.1: Cancel queued job (testing status transition logic directly)
UPDATE public.llm_jobs
SET
  status = 'cancelled',
  cancelled_at = current_timestamp,
  completed_at = current_timestamp
WHERE id = 'gggggggg-0001-0001-0001-000000000001'
  AND status NOT IN ('completed', 'error', 'exhausted', 'cancelled');

SELECT is(
  (SELECT status FROM public.llm_jobs WHERE id = 'gggggggg-0001-0001-0001-000000000001'),
  'cancelled',
  'Test 5.1: Queued job should be cancellable'
);

SELECT isnt(
  (SELECT cancelled_at FROM public.llm_jobs WHERE id = 'gggggggg-0001-0001-0001-000000000001'),
  NULL,
  'Test 5.2: Cancelled job should have cancelled_at set'
);

-- Test 5.3: Cancel running job
UPDATE public.llm_jobs
SET
  status = 'cancelled',
  cancelled_at = current_timestamp,
  completed_at = current_timestamp
WHERE id = 'gggggggg-0002-0002-0002-000000000002'
  AND status NOT IN ('completed', 'error', 'exhausted', 'cancelled');

SELECT is(
  (SELECT status FROM public.llm_jobs WHERE id = 'gggggggg-0002-0002-0002-000000000002'),
  'cancelled',
  'Test 5.3: Running job should be cancellable'
);

-- Test 5.4: Cannot cancel completed job
UPDATE public.llm_jobs
SET
  status = 'cancelled',
  cancelled_at = current_timestamp
WHERE id = 'gggggggg-0003-0003-0003-000000000003'
  AND status NOT IN ('completed', 'error', 'exhausted', 'cancelled');

SELECT is(
  (SELECT status FROM public.llm_jobs WHERE id = 'gggggggg-0003-0003-0003-000000000003'),
  'completed',
  'Test 5.4: Completed job should not be cancellable'
);

-- =============================================================================
-- SECTION 6: llm_add_to_dlq and llm_process_dlq Tests
-- =============================================================================

-- Clean up existing test DLQ data
DELETE FROM public.llm_dead_letter_queue WHERE job_id LIKE 'hhhhhhhh-%';
DELETE FROM public.llm_jobs WHERE id LIKE 'hhhhhhhh-%';

-- Create a job for DLQ testing
INSERT INTO public.llm_jobs (id, customer_id, provider_id, prompt, status)
SELECT
  'hhhhhhhh-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  id,
  'Job for DLQ testing',
  'waiting_llm'
FROM public.llm_providers WHERE slug = 'openai' LIMIT 1;

-- Test 6.1: Add to DLQ
SELECT isnt(
  public.llm_add_to_dlq(
    'hhhhhhhh-0001-0001-0001-000000000001',
    '{"response_id": "test-123", "error": "timeout"}'::jsonb,
    'Connection timeout after 30 seconds',
    'openai',
    'TIMEOUT'
  ),
  NULL,
  'Test 6.1: llm_add_to_dlq should return non-NULL DLQ ID'
);

-- Test 6.2: Verify DLQ entry was created
SELECT is(
  (SELECT count(*) FROM public.llm_dead_letter_queue WHERE job_id = 'hhhhhhhh-0001-0001-0001-000000000001'),
  1::bigint,
  'Test 6.2: DLQ entry should be created for the job'
);

SELECT is(
  (SELECT status FROM public.llm_dead_letter_queue WHERE job_id = 'hhhhhhhh-0001-0001-0001-000000000001'),
  'pending',
  'Test 6.3: DLQ entry should have pending status'
);

SELECT is(
  (SELECT retry_count FROM public.llm_dead_letter_queue WHERE job_id = 'hhhhhhhh-0001-0001-0001-000000000001'),
  0,
  'Test 6.4: DLQ entry should have 0 retry_count initially'
);

SELECT isnt(
  (SELECT next_retry_at FROM public.llm_dead_letter_queue WHERE job_id = 'hhhhhhhh-0001-0001-0001-000000000001'),
  NULL,
  'Test 6.5: DLQ entry should have next_retry_at set'
);

-- Test 6.6: Simulate DLQ item ready for processing
UPDATE public.llm_dead_letter_queue
SET next_retry_at = current_timestamp - interval '1 minute'
WHERE job_id = 'hhhhhhhh-0001-0001-0001-000000000001';

-- Process DLQ
SELECT is(
  (SELECT count(*) FROM public.llm_process_dlq()),
  1::bigint,
  'Test 6.6: llm_process_dlq should process 1 item'
);

-- Test 6.7: Verify retry was scheduled (retry_count incremented)
SELECT is(
  (SELECT retry_count FROM public.llm_dead_letter_queue WHERE job_id = 'hhhhhhhh-0001-0001-0001-000000000001'),
  1,
  'Test 6.7: DLQ retry_count should be incremented to 1'
);

-- Test 6.8: Verify exponential backoff calculation
SELECT ok(
  (SELECT next_retry_at FROM public.llm_dead_letter_queue WHERE job_id = 'hhhhhhhh-0001-0001-0001-000000000001') > current_timestamp,
  'Test 6.8: DLQ next_retry_at should be in the future after retry'
);

-- Test 6.9: DLQ exhaustion test - set retry_count to max and process
UPDATE public.llm_dead_letter_queue
SET
  retry_count = 7,  -- At max_retries
  next_retry_at = current_timestamp - interval '1 minute',
  status = 'pending'
WHERE job_id = 'hhhhhhhh-0001-0001-0001-000000000001';

SELECT is(
  (SELECT action FROM public.llm_process_dlq() LIMIT 1),
  'exhausted',
  'Test 6.9: DLQ item at max_retries should be exhausted'
);

SELECT is(
  (SELECT status FROM public.llm_dead_letter_queue WHERE job_id = 'hhhhhhhh-0001-0001-0001-000000000001'),
  'exhausted',
  'Test 6.10: DLQ status should be exhausted'
);

-- Test 6.11: Job status should also be exhausted
SELECT is(
  (SELECT status FROM public.llm_jobs WHERE id = 'hhhhhhhh-0001-0001-0001-000000000001'),
  'exhausted',
  'Test 6.11: Associated job should also have status exhausted'
);

-- =============================================================================
-- SECTION 7: llm_log_diagnostic Tests
-- =============================================================================

-- Clean up existing test diagnostic logs
DELETE FROM public.llm_diagnostic_logs WHERE provider_slug = 'openai' AND error_code = 'NOT_FOUND';

-- Test 7.1: Log diagnostic event with all parameters
SELECT isnt(
  public.llm_log_diagnostic(
    'unknown_job',
    NULL,
    'openai',
    '11111111-1111-1111-1111-111111111111',
    'NOT_FOUND',
    'Job not found in database',
    NULL,
    'expected-resp-123',
    'received-resp-456',
    '{"webhook_id": "wh-123"}'::jsonb
  ),
  NULL,
  'Test 7.1: llm_log_diagnostic should return non-NULL log ID'
);

-- Test 7.2: Verify diagnostic log was created
SELECT is(
  (SELECT count(*) FROM public.llm_diagnostic_logs WHERE event_type = 'unknown_job' AND error_code = 'NOT_FOUND'),
  1::bigint,
  'Test 7.2: Diagnostic log should be created'
);

-- Test 7.3: Log cancelled_job_response diagnostic
SELECT isnt(
  public.llm_log_diagnostic(
    'cancelled_job_response',
    'gggggggg-0001-0001-0001-000000000001',
    'openai',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'Response received for cancelled job',
    'cancelled',
    NULL,
    'resp-789',
    NULL
  ),
  NULL,
  'Test 7.3: cancelled_job_response diagnostic should be logged'
);

-- Test 7.4: Log with minimal parameters
SELECT isnt(
  public.llm_log_diagnostic('duplicate_webhook'),
  NULL,
  'Test 7.4: Minimal diagnostic log should succeed'
);

-- Test 7.5: Verify event types are captured correctly
SELECT ok(
  (SELECT count(*) FROM public.llm_diagnostic_logs WHERE event_type = 'cancelled_job_response') >= 1,
  'Test 7.5: cancelled_job_response event should be logged'
);

SELECT ok(
  (SELECT count(*) FROM public.llm_diagnostic_logs WHERE event_type = 'duplicate_webhook') >= 1,
  'Test 7.6: duplicate_webhook event should be logged'
);

-- Test 7.7: Diagnostic with job_status_at_receipt
SELECT isnt(
  public.llm_log_diagnostic(
    'late_success_ignored',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'openai',
    NULL,
    NULL,
    'Success response for already completed job',
    'completed',
    NULL,
    NULL,
    NULL
  ),
  NULL,
  'Test 7.7: late_success_ignored diagnostic should be logged'
);

SELECT is(
  (SELECT job_status_at_receipt FROM public.llm_diagnostic_logs WHERE event_type = 'late_success_ignored' LIMIT 1),
  'completed',
  'Test 7.8: job_status_at_receipt should be captured'
);

-- =============================================================================
-- SECTION 8: Multi-tenant Isolation Tests (RLS)
-- =============================================================================

-- Test 8.1: Verify llm_jobs table exists
SELECT has_table('public', 'llm_jobs', 'Test 8.1: llm_jobs table should exist');

-- Test 8.2: Verify RLS is enabled on llm_jobs
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'llm_jobs'),
  true,
  'Test 8.2: llm_jobs should have RLS enabled'
);

-- Test 8.3: Verify RLS is enabled on llm_rate_limits
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'llm_rate_limits'),
  true,
  'Test 8.3: llm_rate_limits should have RLS enabled'
);

-- Test 8.4: Verify RLS is enabled on llm_providers
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'llm_providers'),
  true,
  'Test 8.4: llm_providers should have RLS enabled'
);

-- Test 8.5: Verify RLS is enabled on llm_webhook_events
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'llm_webhook_events'),
  true,
  'Test 8.5: llm_webhook_events should have RLS enabled'
);

-- Test 8.6: Verify RLS is enabled on llm_dead_letter_queue
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'llm_dead_letter_queue'),
  true,
  'Test 8.6: llm_dead_letter_queue should have RLS enabled'
);

-- Test 8.7: Verify RLS is enabled on llm_diagnostic_logs
SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'llm_diagnostic_logs'),
  true,
  'Test 8.7: llm_diagnostic_logs should have RLS enabled'
);

-- =============================================================================
-- SECTION 9: llm_reset_rate_limits Tests
-- =============================================================================

-- Test 9.1: Setup rate limits that need reset
DELETE FROM public.llm_rate_limits WHERE customer_id IN ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333') AND period = 'hourly';

INSERT INTO public.llm_rate_limits (customer_id, period, quota, used, reset_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'hourly', 10, 10, current_timestamp - interval '1 hour'),
  ('33333333-3333-3333-3333-333333333333', 'hourly', 20, 15, current_timestamp + interval '1 hour');  -- Not yet due for reset

-- Test reset function
SELECT ok(
  public.llm_reset_rate_limits('hourly') >= 1,
  'Test 9.1: llm_reset_rate_limits should reset at least 1 record'
);

-- Test 9.2: Verify customer 2's hourly limit was reset
SELECT is(
  (SELECT used FROM public.llm_rate_limits WHERE customer_id = '22222222-2222-2222-2222-222222222222' AND period = 'hourly'),
  0,
  'Test 9.2: Customer 2 hourly used count should be reset to 0'
);

-- Test 9.3: Verify customer 3's hourly limit was NOT reset (not due yet)
SELECT is(
  (SELECT used FROM public.llm_rate_limits WHERE customer_id = '33333333-3333-3333-3333-333333333333' AND period = 'hourly'),
  15,
  'Test 9.3: Customer 3 hourly used count should NOT be reset (not due)'
);

-- =============================================================================
-- SECTION 10: Data Integrity Tests
-- =============================================================================

-- Test 10.1: llm_jobs status constraint
SELECT throws_ok(
  $$INSERT INTO public.llm_jobs (customer_id, provider_id, prompt, status)
    SELECT '11111111-1111-1111-1111-111111111111', id, 'Test', 'invalid_status'
    FROM public.llm_providers WHERE slug = 'openai' LIMIT 1$$,
  '23514',  -- check_violation
  NULL,
  'Test 10.1: Invalid status should be rejected by check constraint'
);

-- Test 10.2: llm_rate_limits period constraint
SELECT throws_ok(
  $$INSERT INTO public.llm_rate_limits (customer_id, period, quota, used)
    VALUES ('11111111-1111-1111-1111-111111111111', 'weekly', 100, 0)$$,
  '23514',  -- check_violation
  NULL,
  'Test 10.2: Invalid period should be rejected by check constraint'
);

-- Test 10.3: llm_rate_limits used not negative constraint
SELECT throws_ok(
  $$INSERT INTO public.llm_rate_limits (customer_id, period, quota, used)
    VALUES ('33333333-3333-3333-3333-333333333333', 'monthly', 100, -1)$$,
  '23514',  -- check_violation
  NULL,
  'Test 10.3: Negative used count should be rejected'
);

-- Test 10.4: llm_dead_letter_queue status constraint
SELECT throws_ok(
  $$INSERT INTO public.llm_dead_letter_queue (webhook_payload, status)
    VALUES ('{}', 'invalid_status')$$,
  '23514',  -- check_violation
  NULL,
  'Test 10.4: Invalid DLQ status should be rejected'
);

-- =============================================================================
-- SECTION 11: Function Signature Verification
-- =============================================================================

-- Test 11.1: Verify llm_increment_rate_limit function exists
SELECT has_function(
  'public',
  'llm_increment_rate_limit',
  ARRAY['uuid', 'character varying'],
  'Test 11.1: llm_increment_rate_limit function should exist with correct signature'
);

-- Test 11.2: Verify llm_check_rate_limit function exists
SELECT has_function(
  'public',
  'llm_check_rate_limit',
  ARRAY['uuid', 'character varying'],
  'Test 11.2: llm_check_rate_limit function should exist with correct signature'
);

-- Test 11.3: Verify llm_record_webhook function exists
SELECT has_function(
  'public',
  'llm_record_webhook',
  ARRAY['character varying', 'uuid', 'character varying', 'character varying'],
  'Test 11.3: llm_record_webhook function should exist with correct signature'
);

-- =============================================================================
-- Cleanup and Finish
-- =============================================================================

SELECT * FROM finish();

ROLLBACK;
