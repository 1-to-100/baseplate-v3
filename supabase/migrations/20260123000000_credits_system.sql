-- =============================================================================
-- CREDITS SYSTEM
-- Ledger-based credit management with wallet cache
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE CreditTransactionType AS ENUM (
  'grant',    -- Credits added (subscription, bonus, manual)
  'charge',   -- Credits consumed (action execution)
  'refund',   -- Credits returned (failed action, dispute)
  'reset'     -- Period reset (zero out and reallocate)
);

COMMENT ON TYPE CreditTransactionType IS 
  'Types of credit transactions in the ledger';

-- =============================================================================
-- TABLES
-- =============================================================================

-- Credit Wallets (cache table)
-- Balance can always be rebuilt from credit_transactions ledger
CREATE TABLE public.credit_wallets (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.credit_wallets IS 
  'Cache of current credit balance per customer. Source of truth is credit_transactions.';

-- Credit Transactions (immutable ledger)
CREATE TABLE public.credit_transactions (
  credit_transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  
  -- Transaction data
  amount INTEGER NOT NULL,  -- positive = grant, negative = charge
  type CreditTransactionType NOT NULL,
  action_code TEXT,         -- e.g. 'web_capture', 'ai_style_guide', 'diffbot'
  reason TEXT NOT NULL,     -- human-readable explanation
  
  -- Idempotency & external reference
  reference_id TEXT,        -- external ID (Stripe event, request ID, etc.)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.credit_transactions IS 
  'Immutable ledger of all credit transactions. NO UPDATE/DELETE allowed.';
COMMENT ON COLUMN public.credit_transactions.amount IS 
  'Positive for grants/refunds, negative for charges';
COMMENT ON COLUMN public.credit_transactions.reference_id IS 
  'External reference for idempotency (e.g. Stripe event ID)';

-- Enforce amount sign matches transaction type (defensive constraint)
ALTER TABLE public.credit_transactions
ADD CONSTRAINT credit_amount_matches_type CHECK (
  (type IN ('grant', 'refund') AND amount > 0)
  OR (type = 'charge' AND amount < 0)
  OR (type = 'reset')
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_credit_transactions_customer_id 
  ON public.credit_transactions(customer_id);

CREATE INDEX idx_credit_transactions_created_at 
  ON public.credit_transactions(created_at DESC);

CREATE INDEX idx_credit_transactions_type 
  ON public.credit_transactions(type);

CREATE INDEX idx_credit_transactions_action_code 
  ON public.credit_transactions(action_code) 
  WHERE action_code IS NOT NULL;

-- Unique index for idempotency (prevents duplicate Stripe events, etc.)
CREATE UNIQUE INDEX idx_credit_transactions_reference_unique
  ON public.credit_transactions(reference_id) 
  WHERE reference_id IS NOT NULL;

-- Composite index for get_credit_transactions query (customer + created_at DESC)
CREATE INDEX idx_credit_transactions_customer_created
  ON public.credit_transactions(customer_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Wallets: users can only read their own customer's wallet
CREATE POLICY credit_wallets_select_own ON public.credit_wallets
  FOR SELECT TO authenticated
  USING (customer_id = public.customer_id());

-- Transactions: users can only read their own customer's transactions
CREATE POLICY credit_transactions_select_own ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (customer_id = public.customer_id());

-- System admins can read all
CREATE POLICY credit_wallets_select_admin ON public.credit_wallets
  FOR SELECT TO authenticated
  USING (public.is_system_admin());

CREATE POLICY credit_transactions_select_admin ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (public.is_system_admin());

-- No direct INSERT/UPDATE/DELETE for regular users
-- All mutations go through SECURITY DEFINER functions below

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Get current credit balance for a customer
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_customer_id UUID DEFAULT NULL)
RETURNS TABLE (
  customer_id UUID,
  balance INTEGER,
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
    cw.balance,
    cw.updated_at
  FROM public.credit_wallets cw
  WHERE cw.customer_id = v_customer_id;
END;
$$;

COMMENT ON FUNCTION public.get_credit_balance IS 
  'Get current credit balance for customer. Defaults to current user''s customer.';

-- Grant credits (add credits to wallet)
CREATE OR REPLACE FUNCTION public.grant_credits(
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
  -- Validate
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Grant amount must be positive';
  END IF;

  -- Get current user if available
  BEGIN
    v_user_id := public.user_id();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Lock wallet row for update (or create if not exists)
  INSERT INTO public.credit_wallets (customer_id, balance, updated_at)
  VALUES (p_customer_id, 0, now())
  ON CONFLICT (customer_id) DO NOTHING;

  SELECT cw.balance INTO v_current_balance
  FROM public.credit_wallets cw
  WHERE cw.customer_id = p_customer_id
  FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  -- Insert transaction
  INSERT INTO public.credit_transactions (
    customer_id,
    user_id,
    amount,
    type,
    action_code,
    reason,
    reference_id
  ) VALUES (
    p_customer_id,
    v_user_id,
    p_amount,
    'grant',
    p_action_code,
    p_reason,
    p_reference_id
  )
  RETURNING credit_transaction_id INTO v_transaction_id;

  -- Update wallet
  UPDATE public.credit_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE credit_wallets.customer_id = p_customer_id;

  RETURN QUERY SELECT true, v_new_balance, v_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.grant_credits IS 
  'Add credits to a customer wallet. Used for subscriptions, bonuses, manual grants.';

-- Charge credits (deduct credits from wallet)
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
  -- Validate
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Charge amount must be positive';
  END IF;

  -- Get current user if available
  BEGIN
    v_user_id := public.user_id();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Ensure wallet exists
  INSERT INTO public.credit_wallets (customer_id, balance, updated_at)
  VALUES (p_customer_id, 0, now())
  ON CONFLICT (customer_id) DO NOTHING;

  -- Lock wallet row for update
  SELECT cw.balance INTO v_current_balance
  FROM public.credit_wallets cw
  WHERE cw.customer_id = p_customer_id
  FOR UPDATE;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT 
      false, 
      v_current_balance, 
      NULL::UUID, 
      format('Insufficient credits. Required: %s, Available: %s', p_amount, v_current_balance);
    RETURN;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  -- Insert transaction (negative amount for charge)
  INSERT INTO public.credit_transactions (
    customer_id,
    user_id,
    amount,
    type,
    action_code,
    reason,
    reference_id
  ) VALUES (
    p_customer_id,
    v_user_id,
    -p_amount,
    'charge',
    p_action_code,
    p_reason,
    p_reference_id
  )
  RETURNING credit_transaction_id INTO v_transaction_id;

  -- Update wallet
  UPDATE public.credit_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE credit_wallets.customer_id = p_customer_id;

  RETURN QUERY SELECT true, v_new_balance, v_transaction_id, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.charge_credits IS 
  'Deduct credits from a customer wallet. Returns error if insufficient balance.';

-- Refund credits (return credits after failed action)
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
  -- Validate
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive';
  END IF;

  -- Get current user if available
  BEGIN
    v_user_id := public.user_id();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Get current balance
  SELECT cw.balance INTO v_current_balance
  FROM public.credit_wallets cw
  WHERE cw.customer_id = p_customer_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Customer wallet not found';
  END IF;

  v_new_balance := v_current_balance + p_amount;

  -- Insert transaction
  INSERT INTO public.credit_transactions (
    customer_id,
    user_id,
    amount,
    type,
    action_code,
    reason,
    reference_id
  ) VALUES (
    p_customer_id,
    v_user_id,
    p_amount,
    'refund',
    p_action_code,
    p_reason,
    p_reference_id
  )
  RETURNING credit_transaction_id INTO v_transaction_id;

  -- Update wallet
  UPDATE public.credit_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE credit_wallets.customer_id = p_customer_id;

  RETURN QUERY SELECT true, v_new_balance, v_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.refund_credits IS 
  'Return credits to a customer wallet. Used for failed actions or disputes.';

-- Reset credits (new billing period)
CREATE OR REPLACE FUNCTION public.reset_credits(
  p_customer_id UUID,
  p_new_balance INTEGER,
  p_reason TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_action_code TEXT DEFAULT NULL  -- e.g. 'period_reset', 'monthly_reset', 'manual_reset'
)
RETURNS TABLE (
  success BOOLEAN,
  old_balance INTEGER,
  new_balance INTEGER,
  transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  -- Validate
  IF p_new_balance < 0 THEN
    RAISE EXCEPTION 'New balance cannot be negative';
  END IF;

  -- Get current user if available
  BEGIN
    v_user_id := public.user_id();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Ensure wallet exists and lock
  INSERT INTO public.credit_wallets (customer_id, balance, updated_at)
  VALUES (p_customer_id, 0, now())
  ON CONFLICT (customer_id) DO NOTHING;

  SELECT cw.balance INTO v_current_balance
  FROM public.credit_wallets cw
  WHERE cw.customer_id = p_customer_id
  FOR UPDATE;

  -- Insert reset transaction (amount is the delta)
  INSERT INTO public.credit_transactions (
    customer_id,
    user_id,
    amount,
    type,
    action_code,
    reason,
    reference_id
  ) VALUES (
    p_customer_id,
    v_user_id,
    p_new_balance - v_current_balance,
    'reset',
    p_action_code,
    p_reason,
    p_reference_id
  )
  RETURNING credit_transaction_id INTO v_transaction_id;

  -- Update wallet
  UPDATE public.credit_wallets
  SET balance = p_new_balance, updated_at = now()
  WHERE credit_wallets.customer_id = p_customer_id;

  RETURN QUERY SELECT true, v_current_balance, p_new_balance, v_transaction_id;
END;
$$;

COMMENT ON FUNCTION public.reset_credits IS 
  'Reset credits to a new balance. Used at start of billing period. Use action_code for context (e.g. monthly_reset, annual_reset, manual_reset).';

-- Check if customer has sufficient credits (read-only check)
CREATE OR REPLACE FUNCTION public.check_credits(
  p_amount INTEGER,
  p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  has_credits BOOLEAN,
  current_balance INTEGER,
  required INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_balance INTEGER;
BEGIN
  v_customer_id := COALESCE(p_customer_id, public.customer_id());
  
  SELECT cw.balance INTO v_balance
  FROM public.credit_wallets cw
  WHERE cw.customer_id = v_customer_id;
  
  v_balance := COALESCE(v_balance, 0);
  
  RETURN QUERY SELECT 
    v_balance >= p_amount,
    v_balance,
    p_amount;
END;
$$;

COMMENT ON FUNCTION public.check_credits IS 
  'Check if customer has sufficient credits for an action. Read-only.';

-- Get credit transaction history
CREATE OR REPLACE FUNCTION public.get_credit_transactions(
  p_customer_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  credit_transaction_id UUID,
  amount INTEGER,
  type CreditTransactionType,
  action_code TEXT,
  reason TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ
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
    ct.credit_transaction_id,
    ct.amount,
    ct.type,
    ct.action_code,
    ct.reason,
    ct.reference_id,
    ct.created_at
  FROM public.credit_transactions ct
  WHERE ct.customer_id = v_customer_id
  ORDER BY ct.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_credit_transactions IS 
  'Get credit transaction history for a customer.';

-- Rebuild wallet balance from ledger (admin/maintenance function)
CREATE OR REPLACE FUNCTION public.rebuild_credit_wallet(p_customer_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calculated_balance INTEGER;
BEGIN
  -- Only system admins can rebuild
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can rebuild wallets';
  END IF;

  -- Calculate balance from ledger
  SELECT COALESCE(SUM(ct.amount), 0) INTO v_calculated_balance
  FROM public.credit_transactions ct
  WHERE ct.customer_id = p_customer_id;

  -- Update wallet
  INSERT INTO public.credit_wallets (customer_id, balance, updated_at)
  VALUES (p_customer_id, v_calculated_balance, now())
  ON CONFLICT (customer_id) DO UPDATE
  SET balance = v_calculated_balance, updated_at = now();

  RETURN v_calculated_balance;
END;
$$;

COMMENT ON FUNCTION public.rebuild_credit_wallet IS 
  'Rebuild wallet balance from transaction ledger. Admin only.';

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT ON public.credit_wallets TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credit_transactions TO authenticated;

-- These are called from edge functions with service role
GRANT EXECUTE ON FUNCTION public.grant_credits TO service_role;
GRANT EXECUTE ON FUNCTION public.charge_credits TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_credits TO service_role;
GRANT EXECUTE ON FUNCTION public.rebuild_credit_wallet TO service_role;

-- =============================================================================
-- TRIGGERS (prevent direct mutations on ledger)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Direct mutations on credit_transactions are not allowed. Use grant_credits, charge_credits, refund_credits, or reset_credits functions.';
END;
$$;

CREATE TRIGGER prevent_credit_transactions_update
  BEFORE UPDATE ON public.credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ledger_mutation();

CREATE TRIGGER prevent_credit_transactions_delete
  BEFORE DELETE ON public.credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ledger_mutation();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
