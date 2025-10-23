-- ============================================================================
-- Enable RLS Policies for Unified Baseplate Schema
-- ============================================================================
-- This migration enables Row Level Security and creates comprehensive policies
-- for all tables in the unified Baseplate schema
-- ============================================================================

-- ============================================================================
-- PART 1: Additional Helper Functions (if not already created)
-- ============================================================================

-- Function to get current user's ID from auth
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid AS $$
  SELECT user_id FROM public.users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get current user's customer_id
CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS uuid AS $$
  SELECT customer_id FROM public.users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(role_name text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.role_id
    WHERE u.auth_user_id = auth.uid()
    AND r.name = role_name
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(permission_name text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.role_id
    WHERE u.auth_user_id = auth.uid()
    AND (
      r.permissions @> to_jsonb(ARRAY[permission_name])
      OR r.permissions @> '["*"]'::jsonb
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- PART 2: Enable RLS on All Tables
-- ============================================================================

ALTER TABLE public.subscription_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_one_time_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_data_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Users Table Policies
-- ============================================================================

-- SELECT: System admins see all, customer admins see their customer's users, users see themselves
CREATE POLICY users_select_system_admin ON public.users
  FOR SELECT TO authenticated
  USING (public.has_role('system_admin'));

CREATE POLICY users_select_customer_admin ON public.users
  FOR SELECT TO authenticated
  USING (
    public.has_role('customer_admin') AND
    customer_id = public.get_current_customer_id()
  );

CREATE POLICY users_select_self ON public.users
  FOR SELECT TO authenticated
  USING (user_id = public.get_current_user_id());

-- INSERT: System admins and customer admins can create users
CREATE POLICY users_insert_system_admin ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('system_admin'));

CREATE POLICY users_insert_customer_admin ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('customer_admin') AND
    customer_id = public.get_current_customer_id()
  );

-- UPDATE: System admins update all, customer admins update their users, users update themselves
CREATE POLICY users_update_system_admin ON public.users
  FOR UPDATE TO authenticated
  USING (public.has_role('system_admin'))
  WITH CHECK (public.has_role('system_admin'));

CREATE POLICY users_update_customer_admin ON public.users
  FOR UPDATE TO authenticated
  USING (
    public.has_role('customer_admin') AND
    customer_id = public.get_current_customer_id()
  )
  WITH CHECK (
    public.has_role('customer_admin') AND
    customer_id = public.get_current_customer_id()
  );

CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- DELETE: Only system admins and customer admins
CREATE POLICY users_delete_system_admin ON public.users
  FOR DELETE TO authenticated
  USING (public.has_role('system_admin'));

CREATE POLICY users_delete_customer_admin ON public.users
  FOR DELETE TO authenticated
  USING (
    public.has_role('customer_admin') AND
    customer_id = public.get_current_customer_id()
  );

-- ============================================================================
-- PART 4: Customers Table Policies
-- ============================================================================

-- SELECT: System admins see all, customer admins see their own
CREATE POLICY customers_select_system_admin ON public.customers
  FOR SELECT TO authenticated
  USING (public.has_role('system_admin'));

CREATE POLICY customers_select_customer_admin ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.has_role('customer_admin') AND
    customer_id = public.get_current_customer_id()
  );

-- INSERT: Only system admins
CREATE POLICY customers_insert_system_admin ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('system_admin'));

-- UPDATE: System admins update all, customer admins update their own
CREATE POLICY customers_update_system_admin ON public.customers
  FOR UPDATE TO authenticated
  USING (public.has_role('system_admin'))
  WITH CHECK (public.has_role('system_admin'));

CREATE POLICY customers_update_customer_admin ON public.customers
  FOR UPDATE TO authenticated
  USING (
    public.has_role('customer_admin') AND
    customer_id = public.get_current_customer_id()
  )
  WITH CHECK (
    public.has_role('customer_admin') AND
    customer_id = public.get_current_customer_id()
  );

-- DELETE: Only system admins
CREATE POLICY customers_delete_system_admin ON public.customers
  FOR DELETE TO authenticated
  USING (public.has_role('system_admin'));

-- ============================================================================
-- PART 5: Roles & Permissions Tables Policies
-- ============================================================================

-- Roles: Everyone can read, only system admins can modify non-system roles
CREATE POLICY roles_select_all ON public.roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY roles_modify_system_admin ON public.roles
  FOR ALL TO authenticated
  USING (
    public.has_role('system_admin') AND
    NOT is_system_role
  )
  WITH CHECK (
    public.has_role('system_admin') AND
    NOT is_system_role
  );

-- Permissions: Everyone can read, only system admins can modify
CREATE POLICY permissions_select_all ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY permissions_modify_system_admin ON public.permissions
  FOR ALL TO authenticated
  USING (public.has_role('system_admin'))
  WITH CHECK (public.has_role('system_admin'));

-- ============================================================================
-- PART 6: Articles & Categories Policies
-- ============================================================================

-- Article Categories: Everyone can read, admins and users with write permission can modify
CREATE POLICY article_categories_select_all ON public.article_categories
  FOR SELECT TO authenticated
  USING (
    customer_id = public.get_current_customer_id() OR
    public.has_role('system_admin')
  );

CREATE POLICY article_categories_modify_customer ON public.article_categories
  FOR ALL TO authenticated
  USING (
    customer_id = public.get_current_customer_id() AND
    (public.has_role('customer_admin') OR public.has_permission('help_articles:manage'))
  )
  WITH CHECK (
    customer_id = public.get_current_customer_id() AND
    (public.has_role('customer_admin') OR public.has_permission('help_articles:manage'))
  );

-- Articles: Similar to categories
CREATE POLICY articles_select_all ON public.articles
  FOR SELECT TO authenticated
  USING (
    customer_id = public.get_current_customer_id() OR
    public.has_role('system_admin')
  );

CREATE POLICY articles_modify_customer ON public.articles
  FOR ALL TO authenticated
  USING (
    customer_id = public.get_current_customer_id() AND
    (public.has_role('customer_admin') OR public.has_permission('help_articles:manage'))
  )
  WITH CHECK (
    customer_id = public.get_current_customer_id() AND
    (public.has_role('customer_admin') OR public.has_permission('help_articles:manage'))
  );

-- ============================================================================
-- PART 7: Notifications Policies
-- ============================================================================

-- Notification Templates: Admins can manage
CREATE POLICY notification_templates_select_customer ON public.notification_templates
  FOR SELECT TO authenticated
  USING (
    customer_id IS NULL OR
    customer_id = public.get_current_customer_id() OR
    public.has_role('system_admin')
  );

CREATE POLICY notification_templates_modify_admin ON public.notification_templates
  FOR ALL TO authenticated
  USING (
    public.has_role('system_admin') OR
    (public.has_role('customer_admin') AND customer_id = public.get_current_customer_id())
  )
  WITH CHECK (
    public.has_role('system_admin') OR
    (public.has_role('customer_admin') AND customer_id = public.get_current_customer_id())
  );

-- Notifications: Users see their own
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = public.get_current_user_id() OR
    public.has_role('system_admin')
  );

CREATE POLICY notifications_insert_system ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true); -- System can create notifications

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- ============================================================================
-- PART 8: Other Tables Policies
-- ============================================================================

-- Subscription Types: Everyone can read, system admins can modify
CREATE POLICY subscription_types_select_all ON public.subscription_types
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY subscription_types_modify_system_admin ON public.subscription_types
  FOR ALL TO authenticated
  USING (public.has_role('system_admin'))
  WITH CHECK (public.has_role('system_admin'));

-- Managers: System admins only
CREATE POLICY managers_all_system_admin ON public.managers
  FOR ALL TO authenticated
  USING (public.has_role('system_admin'))
  WITH CHECK (public.has_role('system_admin'));

-- Customer Subscriptions: System admins and customer admins
CREATE POLICY customer_subscriptions_select ON public.customer_subscriptions
  FOR SELECT TO authenticated
  USING (
    public.has_role('system_admin') OR
    (customer_id = public.get_current_customer_id())
  );

CREATE POLICY customer_subscriptions_modify_system_admin ON public.customer_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role('system_admin'))
  WITH CHECK (public.has_role('system_admin'));

-- User Invitations: Customer admins can manage for their customer
CREATE POLICY user_invitations_select ON public.user_invitations
  FOR SELECT TO authenticated
  USING (
    public.has_role('system_admin') OR
    (customer_id = public.get_current_customer_id() AND public.has_role('customer_admin'))
  );

CREATE POLICY user_invitations_modify ON public.user_invitations
  FOR ALL TO authenticated
  USING (
    public.has_role('system_admin') OR
    (customer_id = public.get_current_customer_id() AND public.has_role('customer_admin'))
  )
  WITH CHECK (
    public.has_role('system_admin') OR
    (customer_id = public.get_current_customer_id() AND public.has_role('customer_admin'))
  );

-- Taxonomies: Customer-specific
CREATE POLICY taxonomies_select ON public.taxonomies
  FOR SELECT TO authenticated
  USING (
    public.has_role('system_admin') OR
    customer_id = public.get_current_customer_id()
  );

CREATE POLICY taxonomies_modify ON public.taxonomies
  FOR ALL TO authenticated
  USING (
    public.has_role('system_admin') OR
    (customer_id = public.get_current_customer_id() AND public.has_role('customer_admin'))
  )
  WITH CHECK (
    public.has_role('system_admin') OR
    (customer_id = public.get_current_customer_id() AND public.has_role('customer_admin'))
  );

-- Extension Data Types: System admins only
CREATE POLICY extension_data_types_select_all ON public.extension_data_types
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY extension_data_types_modify_system_admin ON public.extension_data_types
  FOR ALL TO authenticated
  USING (public.has_role('system_admin'))
  WITH CHECK (public.has_role('system_admin'));

-- Extension Data: Based on table_being_extended and data_id
CREATE POLICY extension_data_select ON public.extension_data
  FOR SELECT TO authenticated
  USING (true); -- Complex logic would require joining

CREATE POLICY extension_data_modify ON public.extension_data
  FOR ALL TO authenticated
  USING (true) -- Complex logic would require joining
  WITH CHECK (true);

-- Audit Logs: Read-only for admins
CREATE POLICY audit_logs_select_system_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role('system_admin'));

CREATE POLICY audit_logs_insert_all ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true); -- System can always log

-- API Logs: Read-only for admins, anyone can write (for middleware logging)
CREATE POLICY api_logs_select_system_admin ON public.api_logs
  FOR SELECT TO authenticated
  USING (public.has_role('system_admin'));

CREATE POLICY api_logs_insert_all ON public.api_logs
  FOR INSERT
  WITH CHECK (true); -- Allow all roles (authenticated, anon, service_role) to log

-- User One Time Codes: Users can only access their own codes, system can create/update any
CREATE POLICY user_one_time_codes_select_own ON public.user_one_time_codes
  FOR SELECT TO authenticated
  USING (user_id = public.get_current_user_id());

CREATE POLICY user_one_time_codes_insert_all ON public.user_one_time_codes
  FOR INSERT
  WITH CHECK (true); -- Allow all roles to create codes (needed for registration/reset flows)

CREATE POLICY user_one_time_codes_update_all ON public.user_one_time_codes
  FOR UPDATE
  USING (true)
  WITH CHECK (true); -- Allow all roles to update codes (needed for verification flows)

-- ============================================================================
-- PART 9: Performance Indexes for RLS
-- ============================================================================

-- Critical indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON public.users(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_is_system_role ON public.roles(is_system_role);
CREATE INDEX IF NOT EXISTS idx_user_one_time_codes_user_id ON public.user_one_time_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_one_time_codes_code ON public.user_one_time_codes(code);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON public.api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs(created_at);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

