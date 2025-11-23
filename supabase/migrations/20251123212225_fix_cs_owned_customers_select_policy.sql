-- =============================================================================
-- FIX: Allow Customer Success users to see all CS managers for their customers
-- =============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS cs_owned_customers_select_self ON public.customer_success_owned_customers;

-- Create a new policy that allows customer success users to see all CS assignments
-- for customers they have access to (not just their own assignments)
CREATE POLICY cs_owned_customers_select_customer_success ON public.customer_success_owned_customers
  FOR SELECT TO authenticated
  USING (
    public.is_customer_success() AND
    customer_id IN (SELECT public.get_accessible_customer_ids())
  );

COMMENT ON POLICY cs_owned_customers_select_customer_success ON public.customer_success_owned_customers IS 
  'Allows customer success users to see all customer success manager assignments for customers they have access to (via customer_success_owned_customers table).';

