-- =============================================================================
-- RESET MY CREDITS (wrapper for frontend)
-- Allows authenticated user to reset only their own customer's credits
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reset_my_credits(
  p_reason TEXT DEFAULT 'Period reset',
  p_reference_id TEXT DEFAULT NULL,
  p_action_code TEXT DEFAULT 'period_reset'
)
RETURNS TABLE (
  success BOOLEAN,
  old_balance INTEGER,
  new_balance INTEGER,
  period_limit INTEGER,
  transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  v_customer_id := public.customer_id();

  RETURN QUERY
  SELECT r.success, r.old_balance, r.new_balance, r.period_limit, r.transaction_id
  FROM public.reset_credits(
    v_customer_id,
    p_reason,
    p_reference_id,
    p_action_code,
    now(),
    now() + INTERVAL '1 month'
  ) r;
END;
$$;

COMMENT ON FUNCTION public.reset_my_credits IS 
  'Reset credits for current user''s customer (new period). For use from frontend.';

GRANT EXECUTE ON FUNCTION public.reset_my_credits(TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
