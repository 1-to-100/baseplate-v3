-- =============================================================================
-- FIX CREDITS SYSTEM GRANTS
-- =============================================================================
-- Fixes GRANT statements to include proper function signatures
-- Required for PostgREST to correctly expose functions to authenticated role
-- =============================================================================

-- Fix grants with proper parameter signatures
GRANT EXECUTE ON FUNCTION public.get_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_credits(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credit_transactions(UUID, INTEGER, INTEGER) TO authenticated;

-- Service role grants (also need proper signatures)
GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.charge_credits(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_credits(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rebuild_credit_wallet(UUID) TO service_role;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
