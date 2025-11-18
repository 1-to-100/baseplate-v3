-- =============================================================================
-- USER SELF-REGISTRATION: Function and RLS Policies
-- =============================================================================

-- Drop existing policies and functions if they exist (idempotent)
DROP POLICY IF EXISTS users_insert_self_registration ON public.users;
DROP POLICY IF EXISTS customers_insert_self_registration ON public.customers;
DROP POLICY IF EXISTS customers_select_anon_by_domain ON public.customers;
DROP POLICY IF EXISTS roles_select_anon ON public.roles;
DROP FUNCTION IF EXISTS public.create_user_for_registration(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.create_customer_for_registration(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.update_user_customer_and_role(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.activate_user_on_email_confirmation();

-- Function: Create user record during registration
-- This SECURITY DEFINER function allows creating a user record even when
-- the user doesn't have a session yet (email confirmation required).
-- It verifies that the auth_user_id exists in auth.users and matches auth.uid()
-- if a session exists, or allows creation if the auth user was just created.
CREATE OR REPLACE FUNCTION public.create_user_for_registration(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_customer_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_auth_exists boolean;
BEGIN
  -- Verify that the auth user exists in auth.users
  -- This ensures we can only create user records for valid auth users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_auth_user_id
  ) INTO v_auth_exists;
  
  IF NOT v_auth_exists THEN
    RAISE EXCEPTION 'Auth user does not exist';
  END IF;
  
  -- Verify that if auth.uid() is available (user has session), it matches
  -- This prevents users from creating records for other auth users
  IF auth.uid() IS NOT NULL AND auth.uid() != p_auth_user_id THEN
    RAISE EXCEPTION 'Auth user ID does not match current session';
  END IF;
  
  -- Check if user record already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = p_auth_user_id) THEN
    RAISE EXCEPTION 'User record already exists';
  END IF;
  
  -- Insert the user record
  INSERT INTO public.users (
    auth_user_id,
    email,
    full_name,
    customer_id,
    status
  ) VALUES (
    p_auth_user_id,
    p_email,
    p_full_name,
    p_customer_id,
    'inactive'
  )
  RETURNING user_id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION public.create_user_for_registration(uuid, text, text, uuid) IS 
  'Creates a user record during registration. Can be called even without a session (email confirmation required). Verifies auth user exists and matches session if available.';

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.create_user_for_registration(uuid, text, text, uuid) TO authenticated, anon;

-- Policy: Allow users to insert their own user record during registration (if they have a session)
-- This policy works when signUp() creates a session immediately
CREATE POLICY users_insert_self_registration ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

COMMENT ON POLICY users_insert_self_registration ON public.users IS 
  'Allows authenticated users to create their own user record during registration when a session exists. For cases without a session, use create_user_for_registration() function.';

-- Function: Create customer record during registration
-- This SECURITY DEFINER function allows creating a customer record even when
-- the user doesn't have a session yet (email confirmation required).
CREATE OR REPLACE FUNCTION public.create_customer_for_registration(
  p_owner_id uuid,
  p_name text,
  p_email_domain text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_user_exists boolean;
  v_auth_user_id uuid;
BEGIN
  -- Verify that the owner user exists and get their auth_user_id
  SELECT 
    EXISTS(SELECT 1 FROM public.users WHERE user_id = p_owner_id),
    (SELECT auth_user_id FROM public.users WHERE user_id = p_owner_id LIMIT 1)
  INTO v_user_exists, v_auth_user_id;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'Owner user does not exist';
  END IF;
  
  -- Verify that if auth.uid() is available (user has session), it matches the owner's auth_user_id
  IF auth.uid() IS NOT NULL AND auth.uid() != v_auth_user_id THEN
    RAISE EXCEPTION 'Owner user does not match current session';
  END IF;
  
  -- Insert the customer record
  INSERT INTO public.customers (
    name,
    email_domain,
    owner_id,
    lifecycle_stage,
    active
  ) VALUES (
    p_name,
    p_email_domain,
    p_owner_id,
    'onboarding',
    true
  )
  RETURNING customer_id INTO v_customer_id;
  
  RETURN v_customer_id;
END;
$$;

COMMENT ON FUNCTION public.create_customer_for_registration(uuid, text, text) IS 
  'Creates a customer record during registration. Can be called even without a session (email confirmation required). Verifies owner user exists and matches session if available.';

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.create_customer_for_registration(uuid, text, text) TO authenticated, anon;

-- Function: Update user with customer_id and role_id during registration
-- This SECURITY DEFINER function allows updating a user record even when
-- the user doesn't have a session yet (email confirmation required).
CREATE OR REPLACE FUNCTION public.update_user_customer_and_role(
  p_user_id uuid,
  p_customer_id uuid,
  p_role_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid;
  v_user_exists boolean;
BEGIN
  -- Verify that the user exists and get their auth_user_id
  SELECT 
    EXISTS(SELECT 1 FROM public.users WHERE user_id = p_user_id),
    (SELECT auth_user_id FROM public.users WHERE user_id = p_user_id LIMIT 1)
  INTO v_user_exists, v_auth_user_id;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  -- Verify that if auth.uid() is available (user has session), it matches the user's auth_user_id
  IF auth.uid() IS NOT NULL AND auth.uid() != v_auth_user_id THEN
    RAISE EXCEPTION 'User does not match current session';
  END IF;
  
  -- Update the user record
  UPDATE public.users
  SET 
    customer_id = p_customer_id,
    role_id = p_role_id,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.update_user_customer_and_role(uuid, uuid, uuid) IS 
  'Updates a user record with customer_id and role_id during registration. Can be called even without a session (email confirmation required). Verifies user exists and matches session if available.';

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.update_user_customer_and_role(uuid, uuid, uuid) TO authenticated, anon;

-- Function: Activate user on email confirmation
-- This function activates a user (sets status to 'active') and assigns standard_user role
-- if the user doesn't have a role yet and has a customer_id
CREATE OR REPLACE FUNCTION public.activate_user_on_email_confirmation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_record RECORD;
  v_standard_user_role_id uuid;
BEGIN
  -- Get current user's user_id
  SELECT user_id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    -- User record doesn't exist yet, nothing to activate
    RETURN;
  END IF;
  
  -- Get user record
  SELECT * INTO v_user_record
  FROM public.users
  WHERE user_id = v_user_id;
  
  -- Only activate if user is currently inactive
  IF v_user_record.status != 'inactive' THEN
    RETURN;
  END IF;
  
  -- Check if user has confirmed email in auth.users
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email_confirmed_at IS NOT NULL
  ) THEN
    -- Email not confirmed yet, don't activate
    RETURN;
  END IF;
  
  -- Get standard_user role ID if user needs a role
  IF v_user_record.role_id IS NULL AND v_user_record.customer_id IS NOT NULL THEN
    SELECT role_id INTO v_standard_user_role_id
    FROM public.roles
    WHERE name = 'standard_user'
    LIMIT 1;
    
    -- Update user: activate and assign role if needed
    UPDATE public.users
    SET 
      status = 'active',
      role_id = COALESCE(v_user_record.role_id, v_standard_user_role_id),
      updated_at = now()
    WHERE user_id = v_user_id;
  ELSE
    -- Just activate, keep existing role
    UPDATE public.users
    SET 
      status = 'active',
      updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.activate_user_on_email_confirmation() IS 
  'Activates a user (sets status to active) when they confirm their email. Also assigns standard_user role if user has no role and belongs to a customer.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.activate_user_on_email_confirmation() TO authenticated;

-- Policy: Allow users to create a customer where they are the owner during registration (if they have a session)
CREATE POLICY customers_insert_self_registration ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id IN (
      SELECT user_id FROM public.users 
      WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON POLICY customers_insert_self_registration ON public.customers IS 
  'Allows authenticated users to create a customer record where they are the owner during registration when a session exists. For cases without a session, use create_customer_for_registration() function.';

-- Policy: Allow anonymous users to read roles (needed during registration)
-- This allows users to look up role IDs during registration even without a session
CREATE POLICY roles_select_anon ON public.roles
  FOR SELECT TO anon
  USING (true);

COMMENT ON POLICY roles_select_anon ON public.roles IS 
  'Allows anonymous users to read roles. Needed during registration to look up role IDs.';

-- Policy: Allow anonymous users to read customers by email_domain (needed during registration)
-- This allows users to check if a customer exists for their email domain during registration
CREATE POLICY customers_select_anon_by_domain ON public.customers
  FOR SELECT TO anon
  USING (true);

COMMENT ON POLICY customers_select_anon_by_domain ON public.customers IS 
  'Allows anonymous users to read customers by email_domain. Needed during registration to determine if user should join existing customer or create new one.';

