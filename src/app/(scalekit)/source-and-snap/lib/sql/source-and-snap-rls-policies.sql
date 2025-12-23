-- =============================================================================
-- SOURCE & SNAP FEATURE - ROW LEVEL SECURITY POLICIES
-- =============================================================================
-- This file drops all existing policies, enables RLS, and creates fresh policies
-- for all Source & Snap tables following Baseplate conventions.
-- 
-- Policy naming follows Baseplate convention: policy_action_name
-- Example: policy_select_same_customer, policy_insert_authenticated_user
-- 
-- See: https://1to100.com/baseplate/developer-guide/database-conventions/
-- =============================================================================
-- 
-- Security Model:
-- - Tenant isolation via can_access_customer(target_customer_id) function
-- - System administrators can access all data (handled within can_access_customer())
-- - Customer success reps can access assigned customers via can_access_customer()
-- - Regular users can only access their own customer's data
-- =============================================================================

-- =============================================================================
-- OPTIONS_DEVICE_PROFILES - RLS Policies (System-scoped)
-- =============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS policy_select_authenticated ON public.options_device_profiles;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.options_device_profiles;
DROP POLICY IF EXISTS policy_update_system_admin ON public.options_device_profiles;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.options_device_profiles;

-- Enable RLS
ALTER TABLE public.options_device_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- All authenticated users can read device profiles
CREATE POLICY policy_select_authenticated
  ON public.options_device_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system administrators can create device profiles
CREATE POLICY policy_insert_system_admin
  ON public.options_device_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

-- Only system administrators can update device profiles
CREATE POLICY policy_update_system_admin
  ON public.options_device_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Only system administrators can delete device profiles
CREATE POLICY policy_delete_system_admin
  ON public.options_device_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- =============================================================================
-- WEB_SCREENSHOT_CAPTURE_REQUESTS - RLS Policies (Customer-scoped)
-- =============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS policy_select_same_customer ON public.web_screenshot_capture_requests;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.web_screenshot_capture_requests;
DROP POLICY IF EXISTS policy_update_same_customer ON public.web_screenshot_capture_requests;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.web_screenshot_capture_requests;

-- Enable RLS
ALTER TABLE public.web_screenshot_capture_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can select capture requests for customers they can access
CREATE POLICY policy_select_same_customer
  ON public.web_screenshot_capture_requests
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

-- Users can create capture requests for customers they can access
-- Must be the requester (requested_by_user_id = current_user_id())
CREATE POLICY policy_insert_same_customer
  ON public.web_screenshot_capture_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
    AND requested_by_user_id = public.current_user_id()
  );

-- Users can update capture requests for customers they can access
-- Note: System/workers may need to update status/timestamps, so we allow
-- updates for any user with customer access (not just the creator)
CREATE POLICY policy_update_same_customer
  ON public.web_screenshot_capture_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

-- Users can delete capture requests they created for customers they can access
CREATE POLICY policy_delete_same_customer
  ON public.web_screenshot_capture_requests
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
    AND requested_by_user_id = public.current_user_id()
  );


-- =============================================================================
-- WEB_SCREENSHOT_CAPTURES - RLS Policies (Customer-scoped)
-- =============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS policy_select_same_customer ON public.web_screenshot_captures;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.web_screenshot_captures;
DROP POLICY IF EXISTS policy_update_same_customer ON public.web_screenshot_captures;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.web_screenshot_captures;

-- Enable RLS
ALTER TABLE public.web_screenshot_captures ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can select capture artifacts for customers they can access
CREATE POLICY policy_select_same_customer
  ON public.web_screenshot_captures
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

-- Users can create capture artifacts for customers they can access
-- Note: Typically created by system/workers after capture completes,
-- but users with customer access can also create them
CREATE POLICY policy_insert_same_customer
  ON public.web_screenshot_captures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

-- Users can update capture artifacts for customers they can access
CREATE POLICY policy_update_same_customer
  ON public.web_screenshot_captures
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

-- Users can delete capture artifacts for customers they can access
CREATE POLICY policy_delete_same_customer
  ON public.web_screenshot_captures
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- =============================================================================
-- STORAGE BUCKET: screenshots - RLS Policies
-- =============================================================================
-- Storage RLS policies for the screenshots bucket
-- Files are stored with path structure: {customer_id}/{filename}
-- Policies verify user access based on customer_id extracted from path
-- =============================================================================

-- Helper function to extract customer_id from storage path
-- Path format: {customer_id}/{filename}
CREATE OR REPLACE FUNCTION public.extract_customer_id_from_storage_path(path text)
RETURNS uuid AS $$
  SELECT (string_to_array(path, '/'))[1]::uuid;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION public.extract_customer_id_from_storage_path(text) IS 
  'Extracts customer_id from storage path. Path format: {customer_id}/{filename}';

-- Drop all existing policies for screenshots bucket
DROP POLICY IF EXISTS screenshots_insert_same_customer ON storage.objects;
DROP POLICY IF EXISTS screenshots_select_same_customer ON storage.objects;
DROP POLICY IF EXISTS screenshots_update_same_customer ON storage.objects;
DROP POLICY IF EXISTS screenshots_delete_same_customer ON storage.objects;

-- Enable RLS on storage.objects (if not already enabled)
-- Note: RLS is typically enabled by default on storage.objects

-- INSERT: Users can upload files to paths matching their customer access
CREATE POLICY screenshots_insert_same_customer
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'screenshots'
    AND public.can_access_customer(
      public.extract_customer_id_from_storage_path(name)
    )
  );

-- SELECT: Users can read files from paths matching their customer access
CREATE POLICY screenshots_select_same_customer
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'screenshots'
    AND public.can_access_customer(
      public.extract_customer_id_from_storage_path(name)
    )
  );

-- UPDATE: Users can update files in paths matching their customer access
CREATE POLICY screenshots_update_same_customer
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'screenshots'
    AND public.can_access_customer(
      public.extract_customer_id_from_storage_path(name)
    )
  )
  WITH CHECK (
    bucket_id = 'screenshots'
    AND public.can_access_customer(
      public.extract_customer_id_from_storage_path(name)
    )
  );

-- DELETE: Users can delete files from paths matching their customer access
CREATE POLICY screenshots_delete_same_customer
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'screenshots'
    AND public.can_access_customer(
      public.extract_customer_id_from_storage_path(name)
    )
  );

