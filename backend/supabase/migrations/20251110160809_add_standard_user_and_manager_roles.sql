-- =============================================================================
-- Add Standard User and Manager Roles
-- Migration: 20251110160809_add_standard_user_and_manager_roles
-- =============================================================================

-- Add standard_user role
-- Base user role with minimal permissions (empty array)
-- This will be the default role for invited non-system users
INSERT INTO public.roles (name, display_name, description, is_system_role, permissions) 
VALUES (
  'standard_user',
  'Standard User',
  'Base user role with minimal permissions',
  true,
  '[]'::jsonb
);

-- Add manager role
-- Manager role with full customer access, same permissions as customer_admin
INSERT INTO public.roles (name, display_name, description, is_system_role, permissions) 
VALUES (
  'manager',
  'Manager',
  'Full access within customer',
  true,
  '["customer:*"]'::jsonb
);

