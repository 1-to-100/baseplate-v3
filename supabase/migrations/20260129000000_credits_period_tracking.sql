-- =============================================================================
-- CREDITS PERIOD TRACKING
-- Extends credits system with subscription-based period limits
-- =============================================================================

-- =============================================================================
-- EXTEND SUBSCRIPTION_TYPES
-- =============================================================================

ALTER TABLE public.subscription_types
  ADD COLUMN IF NOT EXISTS monthly_credits INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.subscription_types.monthly_credits IS 
  'Number of credits granted per month for this subscription tier';

-- =============================================================================
-- EXTEND CREDIT_WALLETS
-- =============================================================================

ALTER TABLE public.credit_wallets
  ADD COLUMN IF NOT EXISTS period_limit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.credit_wallets.period_limit IS 
  'Total credits allocated for current billing period';
COMMENT ON COLUMN public.credit_wallets.period_used IS 
  'Credits consumed in current billing period';
COMMENT ON COLUMN public.credit_wallets.period_starts_at IS 
  'Start of current billing period';
COMMENT ON COLUMN public.credit_wallets.period_ends_at IS 
  'End of current billing period';

CREATE INDEX IF NOT EXISTS idx_credit_wallets_period_ends_at 
  ON public.credit_wallets(period_ends_at);

-- Drop functions that change return type or signature (required before CREATE)
DROP FUNCTION IF EXISTS public.get_credit_balance(uuid);
DROP FUNCTION IF EXISTS public.check_credits(integer, uuid);
DROP FUNCTION IF EXISTS public.reset_credits(uuid, integer, text, text, text);

-- =============================================================================
-- UPDATE: get_credit_balance (add period info)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_credit_balance(p_customer_id UUID DEFAULT NULL)
RETURNS TABLE (
  customer_id UUID,
  balance INTEGER,
  period_limit INTEGER,
  period_used INTEGER,
  period_remaining INTEGER,
  period_starts_at TIMESTAMPTZ,
  period_ends_at TIMESTAMPTZ,
  subscription_name TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  v_customer_id := COALESCE(p_customer_id, public.customer_id());
  
  RETURN QUERY
  SELECT 
    cw.customer_id,
    COALESCE(cw.balance, 0),
    COALESCE(cw.period_limit, 0),
    COALESCE(cw.period_used, 0),
    GREATEST(COALESCE(cw.period_limit, 0) - COALESCE(cw.period_used, 0), 0),
    cw.period_starts_at,
    cw.period_ends_at,
    st.name,
    cw.updated_at
  FROM public.customers c
  LEFT JOIN public.credit_wallets cw ON cw.customer_id = c.customer_id
  LEFT JOIN public.subscription_types st ON st.subscription_type_id = c.subscription_type_id
  WHERE c.customer_id = v_customer_id;
END;
$$;

COMMENT ON FUNCTION public.get_credit_balance IS 
  'Get credit balance with period info. Defaults to current user''s customer.';

-- =============================================================================
-- UPDATE: check_credits (add period info)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_credits(
  p_amount INTEGER,
  p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  has_credits BOOLEAN,
  current_balance INTEGER,
  required INTEGER,
  period_limit INTEGER,
  period_used INTEGER,
  period_remaining INTEGER,
  period_ends_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_balance INTEGER;
  v_period_limit INTEGER;
  v_period_used INTEGER;
  v_period_ends_at TIMESTAMPTZ;
BEGIN
  v_customer_id := COALESCE(p_customer_id, public.customer_id());
  
  SELECT 
    COALESCE(cw.balance, 0),
    COALESCE(cw.period_limit, 0),
    COALESCE(cw.period_used, 0),
    cw.period_ends_at
  INTO v_balance, v_period_limit, v_period_used, v_period_ends_at
  FROM public.credit_wallets cw
  WHERE cw.customer_id = v_customer_id;
  
  v_balance := COALESCE(v_balance, 0);
  v_period_limit := COALESCE(v_period_limit, 0);
  v_period_used := COALESCE(v_period_used, 0);
  
  RETURN QUERY SELECT 
    v_balance >= p_amount,
    v_balance,
    p_amount,
    v_period_limit,
    v_period_used,
    GREATEST(v_period_limit - v_period_used, 0),
    v_period_ends_at;
END;
$$;

COMMENT ON FUNCTION public.check_credits IS 
  'Check if customer has sufficient credits. Returns period info.';

-- =============================================================================
-- UPDATE: charge_credits (add period_used tracking)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.charge_credits(
  p_customer_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_action_code TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  transaction_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Charge amount must be positive';
  END IF;

  BEGIN
    v_user_id := public.user_id();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  INSERT INTO public.credit_wallets (customer_id, balance, period_limit, period_used, updated_at)
  VALUES (p_customer_id, 0, 0, 0, now())
  ON CONFLICT (customer_id) DO NOTHING;

  SELECT cw.balance INTO v_current_balance
  FROM public.credit_wallets cw
  WHERE cw.customer_id = p_customer_id
  FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT 
      false, 
      v_current_balance, 
      NULL::UUID, 
      format('Insufficient credits. Required: %s, Available: %s', p_amount, v_current_balance);
    RETURN;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  INSERT INTO public.credit_transactions (
    customer_id, user_id, amount, type, action_code, reason, reference_id
  ) VALUES (
    p_customer_id, v_user_id, -p_amount, 'charge', p_action_code, p_reason, p_reference_id
  )
  RETURNING credit_transaction_id INTO v_transaction_id;

  UPDATE public.credit_wallets
  SET 
    balance = v_new_balance,
    period_used = period_used + p_amount,
    updated_at = now()
  WHERE credit_wallets.customer_id = p_customer_id;

  RETURN QUERY SELECT true, v_new_balance, v_transaction_id, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.charge_credits IS 
  'Deduct credits from wallet. Updates period_used.';

-- =============================================================================
-- UPDATE: refund_credits (decrement period_used)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.refund_credits(
  p_customer_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_action_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive';
  END IF;

  BEGIN
    v_user_id := public.user_id();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  SELECT cw.balance INTO v_current_balance
  FROM public.credit_wallets cw
  WHERE cw.customer_id = p_customer_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Customer wallet not found';
  END IF;

  v_new_balance := v_current_balance + p_amount;

  INSERT INTO public.credit_transactions (
    customer_id, user_id, amount, type, action_code, reason, reference_id
  ) VALUES (
    p_customer_id, v_user_id, p_amount, 'refund', p_action_code, p_reason, p_reference_id
  )
  RETURNING credit_transaction_id INTO v_transaction_id;

  UPDATE public.credit_wallets
  SET 
    balance = v_new_balance,
    period_used = GREATEST(period_used - p_amount, 0),
    updated_at = now()
  WHERE credit_wallets.customer_id = p_customer_id;

  RETURN QUERY SELECT true, v_new_balance, v_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.refund_credits IS 
  'Return credits to wallet. Decrements period_used.';

-- =============================================================================
-- UPDATE: reset_credits (auto-lookup from subscription)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reset_credits(
  p_customer_id UUID,
  p_reason TEXT DEFAULT 'Period reset',
  p_reference_id TEXT DEFAULT NULL,
  p_action_code TEXT DEFAULT 'period_reset',
  p_period_starts_at TIMESTAMPTZ DEFAULT now(),
  p_period_ends_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 month'
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
  v_monthly_credits INTEGER;
  v_current_balance INTEGER;
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  -- Get monthly_credits from subscription
  SELECT COALESCE(st.monthly_credits, 0)
  INTO v_monthly_credits
  FROM public.customers c
  LEFT JOIN public.subscription_types st ON st.subscription_type_id = c.subscription_type_id
  WHERE c.customer_id = p_customer_id;
  
  v_monthly_credits := COALESCE(v_monthly_credits, 0);
  
  BEGIN
    v_user_id := public.user_id();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;
  
  INSERT INTO public.credit_wallets (customer_id, balance, period_limit, period_used, updated_at)
  VALUES (p_customer_id, 0, 0, 0, now())
  ON CONFLICT (customer_id) DO NOTHING;

  SELECT cw.balance INTO v_current_balance
  FROM public.credit_wallets cw
  WHERE cw.customer_id = p_customer_id
  FOR UPDATE;
  
  v_current_balance := COALESCE(v_current_balance, 0);
  
  INSERT INTO public.credit_transactions (
    customer_id, user_id, amount, type, action_code, reason, reference_id
  ) VALUES (
    p_customer_id, v_user_id, v_monthly_credits - v_current_balance, 'reset', p_action_code, p_reason, p_reference_id
  )
  RETURNING credit_transaction_id INTO v_transaction_id;
  
  UPDATE public.credit_wallets
  SET
    balance = v_monthly_credits,
    period_limit = v_monthly_credits,
    period_used = 0,
    period_starts_at = p_period_starts_at,
    period_ends_at = p_period_ends_at,
    updated_at = now()
  WHERE credit_wallets.customer_id = p_customer_id;
  
  RETURN QUERY SELECT true, v_current_balance, v_monthly_credits, v_monthly_credits, v_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.reset_credits IS 
  'Reset credits for new billing period. Looks up monthly_credits from subscription.';

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_credits(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.charge_credits(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_credits(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
