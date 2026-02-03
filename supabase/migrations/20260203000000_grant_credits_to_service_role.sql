-- =============================================================================
-- GRANT CREDITS FUNCTIONS TO SERVICE_ROLE
-- Allows edge functions to read credit balance via RPC
-- =============================================================================

-- Grant get_credit_balance to service_role so edge functions can use it
GRANT EXECUTE ON FUNCTION public.get_credit_balance(UUID) TO service_role;

-- Grant check_credits to service_role for future use
GRANT EXECUTE ON FUNCTION public.check_credits(INTEGER, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
