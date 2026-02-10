-- Add email to customer_companies so non-admin users can persist email overrides (same pattern as employees, region, etc.)
ALTER TABLE public.customer_companies
  ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.customer_companies.email IS
  'Customer-specific company email';
