-- =============================================================================
-- GRANT CREDITS FUNCTIONS TO SERVICE_ROLE (for edge functions)
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_credit_balance(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_credits(INTEGER, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
