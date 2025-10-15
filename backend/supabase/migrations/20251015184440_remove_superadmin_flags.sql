-- ============================================================================
-- Remove Deprecated Superadmin Flags Migration
-- ============================================================================
-- This migration removes the deprecated is_superadmin and is_customer_success
-- boolean flags from the users table, as the application has fully migrated
-- to using role-based access control via the role_id field.
-- ============================================================================

-- Drop the deprecated is_superadmin column
ALTER TABLE users DROP COLUMN IF EXISTS is_superadmin;

-- Drop the deprecated is_customer_success column
ALTER TABLE users DROP COLUMN IF EXISTS is_customer_success;

