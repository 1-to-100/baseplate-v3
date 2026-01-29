-- =============================================================================
-- STRATEGY FORGE FEATURE - ROW LEVEL SECURITY POLICIES
-- =============================================================================
-- This file drops all existing policies, enables RLS, and creates fresh policies
-- for all Strategy Forge tables following Baseplate conventions.
-- 
-- Policy naming follows Baseplate convention: policy_action_name
-- Example: policy_select_same_customer, policy_insert_system_admin
-- 
-- See: https://1to100.com/baseplate/developer-guide/database-conventions/
-- =============================================================================
-- 
-- Security Model:
-- - Tenant isolation via can_access_customer(target_customer_id) function
-- - System administrators can access all data (handled within can_access_customer())
-- - Customer success reps can access assigned customers via can_access_customer()
-- - Regular users can only access their own customer's data
-- =============================================================================

-- =============================================================================
-- OPTION TABLES (SYSTEM SCOPE) - RLS Policies
-- =============================================================================

-- OPTION_PUBLICATION_STATUS
DROP POLICY IF EXISTS option_publication_status_select_authenticated ON public.option_publication_status;
DROP POLICY IF EXISTS option_publication_status_mutate_admin ON public.option_publication_status;
DROP POLICY IF EXISTS policy_select_authenticated ON public.option_publication_status;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.option_publication_status;
DROP POLICY IF EXISTS policy_update_system_admin ON public.option_publication_status;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.option_publication_status;

ALTER TABLE public.option_publication_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.option_publication_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.option_publication_status
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.option_publication_status
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.option_publication_status
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- OPTION_COMPETITOR_STATUS
DROP POLICY IF EXISTS option_competitor_status_select_authenticated ON public.option_competitor_status;
DROP POLICY IF EXISTS option_competitor_status_mutate_admin ON public.option_competitor_status;
DROP POLICY IF EXISTS policy_select_authenticated ON public.option_competitor_status;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.option_competitor_status;
DROP POLICY IF EXISTS policy_update_system_admin ON public.option_competitor_status;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.option_competitor_status;

ALTER TABLE public.option_competitor_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.option_competitor_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.option_competitor_status
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.option_competitor_status
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.option_competitor_status
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- OPTION_COMPETITOR_SIGNAL_TYPE
DROP POLICY IF EXISTS option_competitor_signal_type_select_authenticated ON public.option_competitor_signal_type;
DROP POLICY IF EXISTS option_competitor_signal_type_mutate_admin ON public.option_competitor_signal_type;
DROP POLICY IF EXISTS policy_select_authenticated ON public.option_competitor_signal_type;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.option_competitor_signal_type;
DROP POLICY IF EXISTS policy_update_system_admin ON public.option_competitor_signal_type;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.option_competitor_signal_type;

ALTER TABLE public.option_competitor_signal_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.option_competitor_signal_type
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.option_competitor_signal_type
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.option_competitor_signal_type
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.option_competitor_signal_type
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- OPTION_DATA_SOURCE
DROP POLICY IF EXISTS option_data_source_select_authenticated ON public.option_data_source;
DROP POLICY IF EXISTS option_data_source_mutate_admin ON public.option_data_source;
DROP POLICY IF EXISTS policy_select_authenticated ON public.option_data_source;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.option_data_source;
DROP POLICY IF EXISTS policy_update_system_admin ON public.option_data_source;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.option_data_source;

ALTER TABLE public.option_data_source ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.option_data_source
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.option_data_source
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.option_data_source
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.option_data_source
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- OPTION_STRATEGY_CHANGE_TYPE
DROP POLICY IF EXISTS option_strategy_change_type_select_authenticated ON public.option_strategy_change_type;
DROP POLICY IF EXISTS option_strategy_change_type_mutate_admin ON public.option_strategy_change_type;
DROP POLICY IF EXISTS policy_select_authenticated ON public.option_strategy_change_type;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.option_strategy_change_type;
DROP POLICY IF EXISTS policy_update_system_admin ON public.option_strategy_change_type;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.option_strategy_change_type;

ALTER TABLE public.option_strategy_change_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.option_strategy_change_type
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.option_strategy_change_type
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.option_strategy_change_type
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.option_strategy_change_type
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- CUSTOMER_JOURNEY_STAGES_SINGLETON (system scope)
DROP POLICY IF EXISTS customer_journey_stages_singleton_select_authenticated ON public.customer_journey_stages_singleton;
DROP POLICY IF EXISTS customer_journey_stages_singleton_mutate_admin ON public.customer_journey_stages_singleton;
DROP POLICY IF EXISTS policy_select_authenticated ON public.customer_journey_stages_singleton;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.customer_journey_stages_singleton;
DROP POLICY IF EXISTS policy_update_system_admin ON public.customer_journey_stages_singleton;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.customer_journey_stages_singleton;

ALTER TABLE public.customer_journey_stages_singleton ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.customer_journey_stages_singleton
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.customer_journey_stages_singleton
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.customer_journey_stages_singleton
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.customer_journey_stages_singleton
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- =============================================================================
-- PRIMARY TABLES (CUSTOMER SCOPE) - RLS Policies
-- =============================================================================

-- COMPANY_STRATEGIES
DROP POLICY IF EXISTS company_strategies_select_accessible ON public.company_strategies;
DROP POLICY IF EXISTS company_strategies_insert_authorized ON public.company_strategies;
DROP POLICY IF EXISTS company_strategies_update_authorized ON public.company_strategies;
DROP POLICY IF EXISTS company_strategies_delete_authorized ON public.company_strategies;
DROP POLICY IF EXISTS policy_select_same_customer ON public.company_strategies;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.company_strategies;
DROP POLICY IF EXISTS policy_update_same_customer ON public.company_strategies;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.company_strategies;

ALTER TABLE public.company_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.company_strategies
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.company_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.company_strategies
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.company_strategies
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- =============================================================================
-- SECONDARY TABLES (CUSTOMER SCOPE) - RLS Policies
-- =============================================================================

-- STRATEGY_PRINCIPLES (inherits strategy access)
DROP POLICY IF EXISTS strategy_principles_select_accessible ON public.strategy_principles;
DROP POLICY IF EXISTS strategy_principles_insert_authorized ON public.strategy_principles;
DROP POLICY IF EXISTS strategy_principles_update_authorized ON public.strategy_principles;
DROP POLICY IF EXISTS strategy_principles_delete_authorized ON public.strategy_principles;
DROP POLICY IF EXISTS policy_select_same_customer ON public.strategy_principles;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.strategy_principles;
DROP POLICY IF EXISTS policy_update_same_customer ON public.strategy_principles;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.strategy_principles;

ALTER TABLE public.strategy_principles ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.strategy_principles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_principles.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );

CREATE POLICY policy_insert_same_customer
  ON public.strategy_principles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_principles.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );

CREATE POLICY policy_update_same_customer
  ON public.strategy_principles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_principles.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_principles.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );

CREATE POLICY policy_delete_same_customer
  ON public.strategy_principles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_principles.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );


-- STRATEGY_VALUES (inherits strategy access)
DROP POLICY IF EXISTS strategy_values_select_accessible ON public.strategy_values;
DROP POLICY IF EXISTS strategy_values_insert_authorized ON public.strategy_values;
DROP POLICY IF EXISTS strategy_values_update_authorized ON public.strategy_values;
DROP POLICY IF EXISTS strategy_values_delete_authorized ON public.strategy_values;
DROP POLICY IF EXISTS policy_select_same_customer ON public.strategy_values;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.strategy_values;
DROP POLICY IF EXISTS policy_update_same_customer ON public.strategy_values;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.strategy_values;

ALTER TABLE public.strategy_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.strategy_values
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_values.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );

CREATE POLICY policy_insert_same_customer
  ON public.strategy_values
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_values.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );

CREATE POLICY policy_update_same_customer
  ON public.strategy_values
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_values.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_values.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );

CREATE POLICY policy_delete_same_customer
  ON public.strategy_values
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_values.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );


-- COMPETITORS (customer scope)
DROP POLICY IF EXISTS competitors_select_accessible ON public.competitors;
DROP POLICY IF EXISTS competitors_insert_authorized ON public.competitors;
DROP POLICY IF EXISTS competitors_update_authorized ON public.competitors;
DROP POLICY IF EXISTS competitors_delete_authorized ON public.competitors;
DROP POLICY IF EXISTS policy_select_same_customer ON public.competitors;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.competitors;
DROP POLICY IF EXISTS policy_update_same_customer ON public.competitors;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.competitors;

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.competitors
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.competitors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.competitors
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.competitors
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- COMPETITOR_SIGNALS (inherits competitor access)
DROP POLICY IF EXISTS competitor_signals_select_accessible ON public.competitor_signals;
DROP POLICY IF EXISTS competitor_signals_insert_authorized ON public.competitor_signals;
DROP POLICY IF EXISTS competitor_signals_update_authorized ON public.competitor_signals;
DROP POLICY IF EXISTS competitor_signals_delete_authorized ON public.competitor_signals;
DROP POLICY IF EXISTS policy_select_same_customer ON public.competitor_signals;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.competitor_signals;
DROP POLICY IF EXISTS policy_update_same_customer ON public.competitor_signals;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.competitor_signals;

ALTER TABLE public.competitor_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.competitor_signals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.competitors c
      WHERE c.competitor_id = competitor_signals.competitor_id
        AND public.can_access_customer(c.customer_id)
    )
  );

CREATE POLICY policy_insert_same_customer
  ON public.competitor_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.competitors c
      WHERE c.competitor_id = competitor_signals.competitor_id
        AND public.can_access_customer(c.customer_id)
    )
  );

CREATE POLICY policy_update_same_customer
  ON public.competitor_signals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.competitors c
      WHERE c.competitor_id = competitor_signals.competitor_id
        AND public.can_access_customer(c.customer_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.competitors c
      WHERE c.competitor_id = competitor_signals.competitor_id
        AND public.can_access_customer(c.customer_id)
    )
  );

CREATE POLICY policy_delete_same_customer
  ON public.competitor_signals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.competitors c
      WHERE c.competitor_id = competitor_signals.competitor_id
        AND public.can_access_customer(c.customer_id)
    )
  );


-- STRATEGY_CHANGE_LOGS (customer scope, append-only)
DROP POLICY IF EXISTS strategy_change_logs_select_accessible ON public.strategy_change_logs;
DROP POLICY IF EXISTS strategy_change_logs_insert_authorized ON public.strategy_change_logs;
DROP POLICY IF EXISTS strategy_change_logs_update_admin_only ON public.strategy_change_logs;
DROP POLICY IF EXISTS strategy_change_logs_delete_admin_only ON public.strategy_change_logs;
DROP POLICY IF EXISTS policy_select_same_customer ON public.strategy_change_logs;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.strategy_change_logs;
DROP POLICY IF EXISTS policy_update_system_admin ON public.strategy_change_logs;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.strategy_change_logs;

ALTER TABLE public.strategy_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.strategy_change_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_change_logs.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );

CREATE POLICY policy_insert_same_customer
  ON public.strategy_change_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.company_strategies s
      WHERE s.strategy_id = strategy_change_logs.strategy_id
        AND public.can_access_customer(s.customer_id)
    )
  );

CREATE POLICY policy_update_system_admin
  ON public.strategy_change_logs
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.strategy_change_logs
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- =============================================================================
-- ADDITIONAL STRATEGY FORGE TABLES (CUSTOMER SCOPE) - RLS Policies
-- =============================================================================

-- PERSONAS (customer scope)
DROP POLICY IF EXISTS personas_select_accessible ON public.personas;
DROP POLICY IF EXISTS personas_insert_authorized ON public.personas;
DROP POLICY IF EXISTS personas_update_authorized ON public.personas;
DROP POLICY IF EXISTS personas_delete_authorized ON public.personas;
DROP POLICY IF EXISTS personas_select_policy ON public.personas;
DROP POLICY IF EXISTS personas_insert_policy ON public.personas;
DROP POLICY IF EXISTS personas_update_policy ON public.personas;
DROP POLICY IF EXISTS personas_delete_policy ON public.personas;
DROP POLICY IF EXISTS policy_select_same_customer ON public.personas;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.personas;
DROP POLICY IF EXISTS policy_update_same_customer ON public.personas;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.personas;

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.personas
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.personas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.personas
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.personas
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- SEGMENTS (customer scope)
DROP POLICY IF EXISTS segments_select_accessible ON public.segments;
DROP POLICY IF EXISTS segments_insert_authorized ON public.segments;
DROP POLICY IF EXISTS segments_update_authorized ON public.segments;
DROP POLICY IF EXISTS segments_delete_authorized ON public.segments;
DROP POLICY IF EXISTS segments_select_policy ON public.segments;
DROP POLICY IF EXISTS segments_insert_policy ON public.segments;
DROP POLICY IF EXISTS segments_update_policy ON public.segments;
DROP POLICY IF EXISTS segments_delete_policy ON public.segments;
DROP POLICY IF EXISTS policy_select_same_customer ON public.segments;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.segments;
DROP POLICY IF EXISTS policy_update_same_customer ON public.segments;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.segments;

ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.segments
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.segments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.segments
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.segments
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- CUSTOMER_JOURNEY_STAGES (customer scope)
DROP POLICY IF EXISTS customer_journey_stages_select_accessible ON public.customer_journey_stages;
DROP POLICY IF EXISTS customer_journey_stages_insert_authorized ON public.customer_journey_stages;
DROP POLICY IF EXISTS customer_journey_stages_update_authorized ON public.customer_journey_stages;
DROP POLICY IF EXISTS customer_journey_stages_delete_authorized ON public.customer_journey_stages;
DROP POLICY IF EXISTS customer_journey_stages_select_policy ON public.customer_journey_stages;
DROP POLICY IF EXISTS customer_journey_stages_insert_policy ON public.customer_journey_stages;
DROP POLICY IF EXISTS customer_journey_stages_update_policy ON public.customer_journey_stages;
DROP POLICY IF EXISTS customer_journey_stages_delete_policy ON public.customer_journey_stages;
DROP POLICY IF EXISTS policy_select_same_customer ON public.customer_journey_stages;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.customer_journey_stages;
DROP POLICY IF EXISTS policy_update_same_customer ON public.customer_journey_stages;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.customer_journey_stages;

ALTER TABLE public.customer_journey_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.customer_journey_stages
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.customer_journey_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.customer_journey_stages
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.customer_journey_stages
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- CUSTOMER_INFO (customer scope)
DROP POLICY IF EXISTS customer_info_select_accessible ON public.customer_info;
DROP POLICY IF EXISTS customer_info_insert_authorized ON public.customer_info;
DROP POLICY IF EXISTS customer_info_update_authorized ON public.customer_info;
DROP POLICY IF EXISTS customer_info_delete_authorized ON public.customer_info;
DROP POLICY IF EXISTS policy_select_same_customer ON public.customer_info;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.customer_info;
DROP POLICY IF EXISTS policy_update_same_customer ON public.customer_info;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.customer_info;

ALTER TABLE public.customer_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.customer_info
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.customer_info
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.customer_info
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.customer_info
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- =============================================================================
-- END OF STRATEGY FORGE RLS POLICIES
-- =============================================================================
-- 
-- Summary:
-- - All existing policies dropped and recreated fresh
-- - RLS enabled on 16 tables:
--   Option Tables (System Scope):
--     - option_publication_status
--     - option_competitor_status
--     - option_competitor_signal_type
--     - option_data_source
--     - option_strategy_change_type
--   Singleton Tables (System Scope):
--     - customer_journey_stages_singleton
--   Primary Tables (Customer Scope):
--     - company_strategies
--   Secondary Tables (Customer Scope):
--     - strategy_principles
--     - strategy_values
--     - competitors
--     - competitor_signals
--     - strategy_change_logs
--   Additional Tables (Customer Scope):
--     - personas
--     - segments
--     - customer_journey_stages
--     - customer_info
-- - Policies follow Baseplate naming convention: policy_action_name
-- - Tenant isolation via can_access_customer(target_customer_id) function
-- - System administrators can access all data (handled within can_access_customer())
-- - Customer success reps can access assigned customers via can_access_customer()
-- - Regular users can only access their own customer's data
-- =============================================================================

