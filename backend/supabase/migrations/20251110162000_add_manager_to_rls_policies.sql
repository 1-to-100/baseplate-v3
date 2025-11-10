-- =============================================================================
-- Add Manager Role to RLS Policies
-- Migration: 20251110162000_add_manager_to_rls_policies
-- =============================================================================
-- This migration updates RLS policies to treat manager role the same as
-- customer_admin role for access control

-- Update is_customer_admin function to also check for manager role
CREATE OR REPLACE FUNCTION public.is_customer_admin()
RETURNS boolean AS $$
  SELECT public.has_role('customer_admin') OR public.has_role('manager');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_customer_admin() IS 
  'Returns true if the currently authenticated user has the customer_admin or manager role (both have the same permissions)';

