# company-scoring-worker Edge Function

Processes the company scoring queue by claiming up to 20 pending rows from `company_scoring_queue`, invoking the `company-scoring` Edge Function for each, and marking rows as completed or failed.

Invoked by **pg_cron** every 5 minutes (job `process-company-scoring-queue`). No auth when called with the service role key from cron. Requires `app.supabase_functions_url` and `app.service_role_key` to be set so the cron can call this function.
