-- =============================================================================
-- Migration: Remove default provider profiles
-- =============================================================================
-- Provider profiles should be feature-specific, not generic defaults.
-- The resolution chain already has fallbacks (provider config.default_model,
-- hardcoded defaults in execution.ts), so these "default" profiles are
-- redundant. Features should seed their own profiles.
-- =============================================================================

delete from public.llm_provider_profiles where name = 'default';
