-- =============================================================================
-- Update Existing Users with Standard User Role
-- Migration: 20251110161000_update_users_with_standard_role
-- =============================================================================
-- This migration assigns the standard_user role to all users who currently
-- have role_id set to NULL

-- Update all users with NULL role_id to have the standard_user role
UPDATE public.users
SET role_id = (
  SELECT role_id 
  FROM public.roles 
  WHERE name = 'standard_user'
  LIMIT 1
)
WHERE role_id IS NULL
  AND deleted_at IS NULL;

-- Add comment to document the change
COMMENT ON TABLE public.users IS 
  'Users within customer organizations. All active users should have a role_id assigned. Standard_user is the default role for regular users.';

