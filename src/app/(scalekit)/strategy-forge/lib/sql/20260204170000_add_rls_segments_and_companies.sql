-- =============================================================================
-- RLS for segments and companies tables
-- Data is available only for authenticated (authorized) users.
-- Customer-scoped tables follow the same pattern as taxonomies/teams.
-- =============================================================================

-- Enable RLS on all segments/companies tables
ALTER TABLE public.option_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_company_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_metadata ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- option_industries (read for all users anon+authenticated, write system_admin)
-- =============================================================================

CREATE POLICY option_industries_select_anon ON public.option_industries
  FOR SELECT TO anon
  USING (true);

CREATE POLICY option_industries_select_authenticated ON public.option_industries
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY option_industries_insert_system_admin ON public.option_industries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY option_industries_update_system_admin ON public.option_industries
  FOR UPDATE TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY option_industries_delete_system_admin ON public.option_industries
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

-- =============================================================================
-- option_company_sizes (read for all users anon+authenticated, write system_admin)
-- =============================================================================

CREATE POLICY option_company_sizes_select_anon ON public.option_company_sizes
  FOR SELECT TO anon
  USING (true);

CREATE POLICY option_company_sizes_select_authenticated ON public.option_company_sizes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY option_company_sizes_insert_system_admin ON public.option_company_sizes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY option_company_sizes_update_system_admin ON public.option_company_sizes
  FOR UPDATE TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY option_company_sizes_delete_system_admin ON public.option_company_sizes
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

-- =============================================================================
-- companies (global table – authenticated read, system_admin write)
-- =============================================================================

CREATE POLICY companies_select_all ON public.companies
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY companies_insert_system_admin ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY companies_update_system_admin ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY companies_delete_system_admin ON public.companies
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

-- =============================================================================
-- lists (customer-scoped – all authenticated users in customer can CRUD)
-- =============================================================================

CREATE POLICY lists_select_customer ON public.lists
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin() OR
    customer_id = public.customer_id()
  );

CREATE POLICY lists_select_customer_success ON public.lists
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  );

CREATE POLICY lists_insert_system_admin ON public.lists
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY lists_insert_customer ON public.lists
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.customer_id());

CREATE POLICY lists_insert_customer_success ON public.lists
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  );

CREATE POLICY lists_update_system_admin ON public.lists
  FOR UPDATE TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY lists_update_customer ON public.lists
  FOR UPDATE TO authenticated
  USING (customer_id = public.customer_id())
  WITH CHECK (customer_id = public.customer_id());

CREATE POLICY lists_update_customer_success ON public.lists
  FOR UPDATE TO authenticated
  USING (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  )
  WITH CHECK (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  );

CREATE POLICY lists_delete_system_admin ON public.lists
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

CREATE POLICY lists_delete_customer ON public.lists
  FOR DELETE TO authenticated
  USING (customer_id = public.customer_id());

CREATE POLICY lists_delete_customer_success ON public.lists
  FOR DELETE TO authenticated
  USING (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  );

-- =============================================================================
-- list_companies (access via list -> customer_id, same pattern as team_members)
-- =============================================================================

CREATE POLICY list_companies_select_system_admin ON public.list_companies
  FOR SELECT TO authenticated
  USING (public.is_system_admin());

CREATE POLICY list_companies_select_customer ON public.list_companies
  FOR SELECT TO authenticated
  USING (
    list_id IN (
      SELECT list_id FROM public.lists
      WHERE customer_id IN (SELECT public.get_accessible_customer_ids())
    )
  );

CREATE POLICY list_companies_insert_system_admin ON public.list_companies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY list_companies_insert_customer ON public.list_companies
  FOR INSERT TO authenticated
  WITH CHECK (
    list_id IN (
      SELECT list_id FROM public.lists
      WHERE customer_id IN (SELECT public.get_accessible_customer_ids())
    )
  );

CREATE POLICY list_companies_update_system_admin ON public.list_companies
  FOR UPDATE TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY list_companies_update_customer ON public.list_companies
  FOR UPDATE TO authenticated
  USING (
    list_id IN (
      SELECT list_id FROM public.lists
      WHERE customer_id IN (SELECT public.get_accessible_customer_ids())
    )
  )
  WITH CHECK (
    list_id IN (
      SELECT list_id FROM public.lists
      WHERE customer_id IN (SELECT public.get_accessible_customer_ids())
    )
  );

CREATE POLICY list_companies_delete_system_admin ON public.list_companies
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

CREATE POLICY list_companies_delete_customer ON public.list_companies
  FOR DELETE TO authenticated
  USING (
    list_id IN (
      SELECT list_id FROM public.lists
      WHERE customer_id IN (SELECT public.get_accessible_customer_ids())
    )
  );

-- =============================================================================
-- customer_companies (customer-scoped – all authenticated users in customer can CRUD)
-- =============================================================================

CREATE POLICY customer_companies_select_customer ON public.customer_companies
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin() OR
    customer_id = public.customer_id()
  );

CREATE POLICY customer_companies_select_customer_success ON public.customer_companies
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  );

CREATE POLICY customer_companies_insert_system_admin ON public.customer_companies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY customer_companies_insert_customer ON public.customer_companies
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.customer_id());

CREATE POLICY customer_companies_insert_customer_success ON public.customer_companies
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  );

CREATE POLICY customer_companies_update_system_admin ON public.customer_companies
  FOR UPDATE TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY customer_companies_update_customer ON public.customer_companies
  FOR UPDATE TO authenticated
  USING (customer_id = public.customer_id())
  WITH CHECK (customer_id = public.customer_id());

CREATE POLICY customer_companies_update_customer_success ON public.customer_companies
  FOR UPDATE TO authenticated
  USING (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  )
  WITH CHECK (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  );

CREATE POLICY customer_companies_delete_system_admin ON public.customer_companies
  FOR DELETE TO authenticated
  USING (public.is_system_admin());

CREATE POLICY customer_companies_delete_customer ON public.customer_companies
  FOR DELETE TO authenticated
  USING (customer_id = public.customer_id());

CREATE POLICY customer_companies_delete_customer_success ON public.customer_companies
  FOR DELETE TO authenticated
  USING (
    customer_id IN (SELECT public.get_accessible_customer_ids())
  );

-- =============================================================================
-- company_metadata (tied to companies – authenticated read, system_admin write)
-- =============================================================================

CREATE POLICY company_metadata_select_all ON public.company_metadata
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY company_metadata_insert_system_admin ON public.company_metadata
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY company_metadata_update_system_admin ON public.company_metadata
  FOR UPDATE TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY company_metadata_delete_system_admin ON public.company_metadata
  FOR DELETE TO authenticated
  USING (public.is_system_admin());
