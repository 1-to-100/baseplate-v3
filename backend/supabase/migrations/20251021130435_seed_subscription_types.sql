-- ============================================================================
-- Seed Subscription Types Data
-- ============================================================================
-- This migration seeds the subscription_types table with default plans
-- Note: The table and structure are already created in the initial migration
-- ============================================================================

-- Insert default subscription types using the correct table name
INSERT INTO public.subscription_types (
  name,
  description,
  active,
  is_default,
  max_users,
  max_contacts,
  created_at,
  updated_at
)
VALUES
  (
    'Free',
    'Perfect for individuals and small teams getting started',
    true,
    false,
    3,
    100,
    NOW(),
    NOW()
  ),
  (
    'Starter',
    'Great for growing teams that need more resources',
    true,
    false,
    10,
    1000,
    NOW(),
    NOW()
  ),
  (
    'Professional',
    'For established teams that need comprehensive features',
    true,
    false,
    50,
    10000,
    NOW(),
    NOW()
  ),
  (
    'Enterprise',
    'For large organizations with custom requirements',
    true,
    false,
    NULL, -- unlimited
    NULL, -- unlimited
    NOW(),
    NOW()
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  max_users = EXCLUDED.max_users,
  max_contacts = EXCLUDED.max_contacts,
  updated_at = NOW();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

