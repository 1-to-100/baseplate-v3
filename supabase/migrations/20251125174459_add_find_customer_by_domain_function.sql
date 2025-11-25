-- =============================================================================
-- ADD: Function to find customer by email domain during registration
-- =============================================================================
-- This function allows looking up customers by email_domain even when
-- the user doesn't have a customer_id yet (needed during OAuth registration)

-- Function: Find customer by email domain during registration
-- This SECURITY DEFINER function allows looking up customers by email_domain
-- even when the user doesn't have a customer_id yet (needed during registration)
CREATE OR REPLACE FUNCTION public.find_customer_by_domain(
  p_email_domain text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Find customer by email_domain
  SELECT customer_id INTO v_customer_id
  FROM public.customers
  WHERE email_domain = p_email_domain
  LIMIT 1;
  
  RETURN v_customer_id;
END;
$$;

COMMENT ON FUNCTION public.find_customer_by_domain(text) IS 
  'Finds a customer by email_domain during registration. Bypasses RLS to allow lookup even when user has no customer_id yet.';

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.find_customer_by_domain(text) TO authenticated, anon;

