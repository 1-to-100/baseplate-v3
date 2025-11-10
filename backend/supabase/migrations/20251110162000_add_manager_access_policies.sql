-- =============================================================================
-- Add Manager Role Access Policies
-- Migration: 20251110162000_add_manager_access_policies
-- =============================================================================
-- This migration gives Manager users the same access as Customer Admin users
-- by creating similar RLS policies and helper functions

-- =============================================================================
-- HELPER FUNCTION
-- =============================================================================

-- Check if current user is a manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean AS $$
  SELECT public.has_role('manager');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_manager() IS 
  'Returns true if the currently authenticated user has the manager role';

-- Check if current user is customer admin or manager (both have same permissions)
CREATE OR REPLACE FUNCTION public.is_customer_admin_or_manager()
RETURNS boolean AS $$
  SELECT public.is_customer_admin() OR public.is_manager();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_customer_admin_or_manager() IS 
  'Returns true if the currently authenticated user has the customer_admin or manager role';

-- Grant execute permission on new functions
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_customer_admin_or_manager() TO authenticated;

-- =============================================================================
-- RLS POLICIES: USERS TABLE - Add Manager Policies
-- =============================================================================

CREATE POLICY users_select_manager ON public.users
  FOR SELECT TO authenticated
  USING (
    public.is_manager() AND
    customer_id = public.customer_id()
  );

CREATE POLICY users_insert_manager ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_manager() AND
    customer_id = public.customer_id()
  );

CREATE POLICY users_update_manager ON public.users
  FOR UPDATE TO authenticated
  USING (
    public.is_manager() AND
    customer_id = public.customer_id()
  )
  WITH CHECK (
    public.is_manager() AND
    customer_id = public.customer_id()
  );

CREATE POLICY users_delete_manager ON public.users
  FOR DELETE TO authenticated
  USING (
    public.is_manager() AND
    customer_id = public.customer_id()
  );

-- =============================================================================
-- RLS POLICIES: CUSTOMERS TABLE - Add Manager Policies
-- =============================================================================

CREATE POLICY customers_select_manager ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.is_manager() AND
    customer_id = public.customer_id()
  );

CREATE POLICY customers_update_manager ON public.customers
  FOR UPDATE TO authenticated
  USING (
    public.is_manager() AND
    customer_id = public.customer_id()
  )
  WITH CHECK (
    public.is_manager() AND
    customer_id = public.customer_id()
  );

-- =============================================================================
-- RLS POLICIES: USER INVITATIONS - Add Manager Policies
-- =============================================================================

CREATE POLICY user_invitations_select_manager ON public.user_invitations
  FOR SELECT TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY user_invitations_insert_manager ON public.user_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY user_invitations_update_manager ON public.user_invitations
  FOR UPDATE TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  )
  WITH CHECK (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY user_invitations_delete_manager ON public.user_invitations
  FOR DELETE TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  );

-- =============================================================================
-- RLS POLICIES: TAXONOMIES - Add Manager Policies
-- =============================================================================

CREATE POLICY taxonomies_select_manager ON public.taxonomies
  FOR SELECT TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY taxonomies_insert_manager ON public.taxonomies
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY taxonomies_update_manager ON public.taxonomies
  FOR UPDATE TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  )
  WITH CHECK (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY taxonomies_delete_manager ON public.taxonomies
  FOR DELETE TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  );

-- =============================================================================
-- RLS POLICIES: HELP ARTICLES - Add Manager Policies
-- =============================================================================

CREATE POLICY help_article_categories_select_manager ON public.help_article_categories
  FOR SELECT TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY help_article_categories_insert_manager ON public.help_article_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY help_article_categories_update_manager ON public.help_article_categories
  FOR UPDATE TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  )
  WITH CHECK (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY help_article_categories_delete_manager ON public.help_article_categories
  FOR DELETE TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY help_articles_select_manager ON public.help_articles
  FOR SELECT TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY help_articles_insert_manager ON public.help_articles
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY help_articles_update_manager ON public.help_articles
  FOR UPDATE TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  )
  WITH CHECK (
    customer_id = public.customer_id() AND public.is_manager()
  );

CREATE POLICY help_articles_delete_manager ON public.help_articles
  FOR DELETE TO authenticated
  USING (
    customer_id = public.customer_id() AND public.is_manager()
  );

-- =============================================================================
-- RLS POLICIES: NOTIFICATION TEMPLATES - Add Manager Policies
-- =============================================================================

CREATE POLICY notification_templates_insert_manager ON public.notification_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_manager() AND customer_id = public.customer_id()
  );

CREATE POLICY notification_templates_update_manager ON public.notification_templates
  FOR UPDATE TO authenticated
  USING (
    public.is_manager() AND customer_id = public.customer_id()
  )
  WITH CHECK (
    public.is_manager() AND customer_id = public.customer_id()
  );

CREATE POLICY notification_templates_delete_manager ON public.notification_templates
  FOR DELETE TO authenticated
  USING (
    public.is_manager() AND customer_id = public.customer_id()
  );

-- =============================================================================
-- RLS POLICIES: TEAMS - Add Manager Policies
-- =============================================================================

CREATE POLICY teams_select_manager ON public.teams
  FOR SELECT TO authenticated
  USING (
    public.is_manager() AND 
    customer_id = public.customer_id()
  );

CREATE POLICY teams_insert_manager ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_manager() AND 
    customer_id = public.customer_id()
  );

CREATE POLICY teams_update_manager ON public.teams
  FOR UPDATE TO authenticated
  USING (
    public.is_manager() AND 
    customer_id = public.customer_id()
  );

CREATE POLICY teams_delete_manager ON public.teams
  FOR DELETE TO authenticated
  USING (
    public.is_manager() AND 
    customer_id = public.customer_id()
  );

-- =============================================================================
-- RLS POLICIES: TEAM MEMBERS - Add Manager Policies
-- =============================================================================

CREATE POLICY team_members_select_manager ON public.team_members
  FOR SELECT TO authenticated
  USING (
    public.is_manager() AND
    team_id IN (
      SELECT team_id FROM public.teams 
      WHERE customer_id = public.customer_id()
    )
  );

CREATE POLICY team_members_insert_manager ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_manager() AND
    team_id IN (
      SELECT team_id FROM public.teams 
      WHERE customer_id = public.customer_id()
    )
  );

CREATE POLICY team_members_update_manager ON public.team_members
  FOR UPDATE TO authenticated
  USING (
    public.is_manager() AND
    team_id IN (
      SELECT team_id FROM public.teams 
      WHERE customer_id = public.customer_id()
    )
  );

CREATE POLICY team_members_delete_manager ON public.team_members
  FOR DELETE TO authenticated
  USING (
    public.is_manager() AND
    team_id IN (
      SELECT team_id FROM public.teams 
      WHERE customer_id = public.customer_id()
    )
  );

-- =============================================================================
-- RLS POLICIES: SUBSCRIPTIONS - Add Manager Policies  
-- =============================================================================

CREATE POLICY subscriptions_select_manager ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    public.is_manager() AND 
    customer_id = public.customer_id()
  );

