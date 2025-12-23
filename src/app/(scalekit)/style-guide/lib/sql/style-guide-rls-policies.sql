-- =============================================================================
-- STYLE GUIDE FEATURE - ROW LEVEL SECURITY POLICIES
-- =============================================================================
-- This file drops all existing policies, enables RLS, and creates fresh policies
-- for all Style Guide tables following Baseplate conventions.
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
-- OPTION SINGLETON TABLES (SYSTEM SCOPE) - RLS Policies
-- =============================================================================

-- LANGUAGE_LEVEL_OPTION_ITEMS
DROP POLICY IF EXISTS language_level_option_items_select_all ON public.language_level_option_items;
DROP POLICY IF EXISTS language_level_option_items_insert_system_admin ON public.language_level_option_items;
DROP POLICY IF EXISTS language_level_option_items_update_system_admin ON public.language_level_option_items;
DROP POLICY IF EXISTS language_level_option_items_delete_system_admin ON public.language_level_option_items;
DROP POLICY IF EXISTS policy_select_authenticated ON public.language_level_option_items;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.language_level_option_items;
DROP POLICY IF EXISTS policy_update_system_admin ON public.language_level_option_items;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.language_level_option_items;

ALTER TABLE public.language_level_option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.language_level_option_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.language_level_option_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.language_level_option_items
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.language_level_option_items
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- USE_OF_JARGON_OPTION_ITEMS
DROP POLICY IF EXISTS use_of_jargon_option_items_select_all ON public.use_of_jargon_option_items;
DROP POLICY IF EXISTS use_of_jargon_option_items_insert_system_admin ON public.use_of_jargon_option_items;
DROP POLICY IF EXISTS use_of_jargon_option_items_update_system_admin ON public.use_of_jargon_option_items;
DROP POLICY IF EXISTS use_of_jargon_option_items_delete_system_admin ON public.use_of_jargon_option_items;
DROP POLICY IF EXISTS policy_select_authenticated ON public.use_of_jargon_option_items;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.use_of_jargon_option_items;
DROP POLICY IF EXISTS policy_update_system_admin ON public.use_of_jargon_option_items;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.use_of_jargon_option_items;

ALTER TABLE public.use_of_jargon_option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.use_of_jargon_option_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.use_of_jargon_option_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.use_of_jargon_option_items
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.use_of_jargon_option_items
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- STORYTELLING_OPTION_ITEMS
DROP POLICY IF EXISTS storytelling_option_items_select_all ON public.storytelling_option_items;
DROP POLICY IF EXISTS storytelling_option_items_insert_system_admin ON public.storytelling_option_items;
DROP POLICY IF EXISTS storytelling_option_items_update_system_admin ON public.storytelling_option_items;
DROP POLICY IF EXISTS storytelling_option_items_delete_system_admin ON public.storytelling_option_items;
DROP POLICY IF EXISTS policy_select_authenticated ON public.storytelling_option_items;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.storytelling_option_items;
DROP POLICY IF EXISTS policy_update_system_admin ON public.storytelling_option_items;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.storytelling_option_items;

ALTER TABLE public.storytelling_option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.storytelling_option_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.storytelling_option_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.storytelling_option_items
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.storytelling_option_items
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- HUMOR_USAGE_OPTION_ITEMS
DROP POLICY IF EXISTS humor_usage_option_items_select_all ON public.humor_usage_option_items;
DROP POLICY IF EXISTS humor_usage_option_items_insert_system_admin ON public.humor_usage_option_items;
DROP POLICY IF EXISTS humor_usage_option_items_update_system_admin ON public.humor_usage_option_items;
DROP POLICY IF EXISTS humor_usage_option_items_delete_system_admin ON public.humor_usage_option_items;
DROP POLICY IF EXISTS policy_select_authenticated ON public.humor_usage_option_items;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.humor_usage_option_items;
DROP POLICY IF EXISTS policy_update_system_admin ON public.humor_usage_option_items;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.humor_usage_option_items;

ALTER TABLE public.humor_usage_option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.humor_usage_option_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.humor_usage_option_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.humor_usage_option_items
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.humor_usage_option_items
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- PACING_OPTION_ITEMS
DROP POLICY IF EXISTS pacing_option_items_select_all ON public.pacing_option_items;
DROP POLICY IF EXISTS pacing_option_items_insert_system_admin ON public.pacing_option_items;
DROP POLICY IF EXISTS pacing_option_items_update_system_admin ON public.pacing_option_items;
DROP POLICY IF EXISTS pacing_option_items_delete_system_admin ON public.pacing_option_items;
DROP POLICY IF EXISTS policy_select_authenticated ON public.pacing_option_items;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.pacing_option_items;
DROP POLICY IF EXISTS policy_update_system_admin ON public.pacing_option_items;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.pacing_option_items;

ALTER TABLE public.pacing_option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.pacing_option_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.pacing_option_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.pacing_option_items
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.pacing_option_items
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- SENTENCE_OPTION_ITEMS_SINGLETON
DROP POLICY IF EXISTS sentence_option_items_singleton_select_all ON public.sentence_option_items_singleton;
DROP POLICY IF EXISTS sentence_option_items_singleton_insert_system_admin ON public.sentence_option_items_singleton;
DROP POLICY IF EXISTS sentence_option_items_singleton_update_system_admin ON public.sentence_option_items_singleton;
DROP POLICY IF EXISTS sentence_option_items_singleton_delete_system_admin ON public.sentence_option_items_singleton;
DROP POLICY IF EXISTS policy_select_authenticated ON public.sentence_option_items_singleton;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.sentence_option_items_singleton;
DROP POLICY IF EXISTS policy_update_system_admin ON public.sentence_option_items_singleton;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.sentence_option_items_singleton;

ALTER TABLE public.sentence_option_items_singleton ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.sentence_option_items_singleton
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.sentence_option_items_singleton
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.sentence_option_items_singleton
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.sentence_option_items_singleton
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- FORMALITY_OPTION_ITEMS
DROP POLICY IF EXISTS formality_option_items_select_all ON public.formality_option_items;
DROP POLICY IF EXISTS formality_option_items_insert_system_admin ON public.formality_option_items;
DROP POLICY IF EXISTS formality_option_items_update_system_admin ON public.formality_option_items;
DROP POLICY IF EXISTS formality_option_items_delete_system_admin ON public.formality_option_items;
DROP POLICY IF EXISTS policy_select_authenticated ON public.formality_option_items;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.formality_option_items;
DROP POLICY IF EXISTS policy_update_system_admin ON public.formality_option_items;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.formality_option_items;

ALTER TABLE public.formality_option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.formality_option_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.formality_option_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.formality_option_items
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.formality_option_items
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- COMPLIANCE_RULE_TYPE_OPTION_ITEMS
DROP POLICY IF EXISTS compliance_rule_type_option_items_select_all ON public.compliance_rule_type_option_items;
DROP POLICY IF EXISTS compliance_rule_type_option_items_insert_system_admin ON public.compliance_rule_type_option_items;
DROP POLICY IF EXISTS compliance_rule_type_option_items_update_system_admin ON public.compliance_rule_type_option_items;
DROP POLICY IF EXISTS compliance_rule_type_option_items_delete_system_admin ON public.compliance_rule_type_option_items;
DROP POLICY IF EXISTS policy_select_authenticated ON public.compliance_rule_type_option_items;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.compliance_rule_type_option_items;
DROP POLICY IF EXISTS policy_update_system_admin ON public.compliance_rule_type_option_items;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.compliance_rule_type_option_items;

ALTER TABLE public.compliance_rule_type_option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.compliance_rule_type_option_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.compliance_rule_type_option_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.compliance_rule_type_option_items
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.compliance_rule_type_option_items
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- TYPOGRAPHY_STYLE_OPTIONS
DROP POLICY IF EXISTS typography_style_options_select_all ON public.typography_style_options;
DROP POLICY IF EXISTS typography_style_options_insert_system_admin ON public.typography_style_options;
DROP POLICY IF EXISTS typography_style_options_update_system_admin ON public.typography_style_options;
DROP POLICY IF EXISTS typography_style_options_delete_system_admin ON public.typography_style_options;
DROP POLICY IF EXISTS policy_select_authenticated ON public.typography_style_options;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.typography_style_options;
DROP POLICY IF EXISTS policy_update_system_admin ON public.typography_style_options;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.typography_style_options;

ALTER TABLE public.typography_style_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.typography_style_options
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.typography_style_options
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.typography_style_options
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.typography_style_options
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- LOGO_TYPE_OPTIONS
DROP POLICY IF EXISTS logo_type_options_select_all ON public.logo_type_options;
DROP POLICY IF EXISTS logo_type_options_insert_system_admin ON public.logo_type_options;
DROP POLICY IF EXISTS logo_type_options_update_system_admin ON public.logo_type_options;
DROP POLICY IF EXISTS logo_type_options_delete_system_admin ON public.logo_type_options;
DROP POLICY IF EXISTS policy_select_authenticated ON public.logo_type_options;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.logo_type_options;
DROP POLICY IF EXISTS policy_update_system_admin ON public.logo_type_options;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.logo_type_options;

ALTER TABLE public.logo_type_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.logo_type_options
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.logo_type_options
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.logo_type_options
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.logo_type_options
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- FONT_OPTIONS
DROP POLICY IF EXISTS font_options_select_all ON public.font_options;
DROP POLICY IF EXISTS font_options_insert_system_admin ON public.font_options;
DROP POLICY IF EXISTS font_options_update_system_admin ON public.font_options;
DROP POLICY IF EXISTS font_options_delete_system_admin ON public.font_options;
DROP POLICY IF EXISTS policy_select_authenticated ON public.font_options;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.font_options;
DROP POLICY IF EXISTS policy_update_system_admin ON public.font_options;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.font_options;

ALTER TABLE public.font_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.font_options
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.font_options
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.font_options
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.font_options
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- SOCIAL_TEMPLATE_TYPES
DROP POLICY IF EXISTS social_template_types_select_all ON public.social_template_types;
DROP POLICY IF EXISTS social_template_types_insert_system_admin ON public.social_template_types;
DROP POLICY IF EXISTS social_template_types_update_system_admin ON public.social_template_types;
DROP POLICY IF EXISTS social_template_types_delete_system_admin ON public.social_template_types;
DROP POLICY IF EXISTS policy_select_authenticated ON public.social_template_types;
DROP POLICY IF EXISTS policy_insert_system_admin ON public.social_template_types;
DROP POLICY IF EXISTS policy_update_system_admin ON public.social_template_types;
DROP POLICY IF EXISTS policy_delete_system_admin ON public.social_template_types;

ALTER TABLE public.social_template_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_authenticated
  ON public.social_template_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY policy_insert_system_admin
  ON public.social_template_types
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_update_system_admin
  ON public.social_template_types
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY policy_delete_system_admin
  ON public.social_template_types
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());


-- =============================================================================
-- PRIMARY TABLES (CUSTOMER SCOPE) - RLS Policies
-- =============================================================================

-- STYLE_GUIDES
DROP POLICY IF EXISTS style_guides_select_system_admin ON public.style_guides;
DROP POLICY IF EXISTS style_guides_select_customer_admin ON public.style_guides;
DROP POLICY IF EXISTS style_guides_select_customer_success ON public.style_guides;
DROP POLICY IF EXISTS style_guides_insert_system_admin ON public.style_guides;
DROP POLICY IF EXISTS style_guides_insert_customer_admin ON public.style_guides;
DROP POLICY IF EXISTS style_guides_insert_customer_member ON public.style_guides;
DROP POLICY IF EXISTS style_guides_update_system_admin ON public.style_guides;
DROP POLICY IF EXISTS style_guides_update_customer_admin ON public.style_guides;
DROP POLICY IF EXISTS style_guides_update_customer_success ON public.style_guides;
DROP POLICY IF EXISTS style_guides_delete_system_admin ON public.style_guides;
DROP POLICY IF EXISTS style_guides_delete_customer_admin ON public.style_guides;
DROP POLICY IF EXISTS policy_select_same_customer ON public.style_guides;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.style_guides;
DROP POLICY IF EXISTS policy_update_same_customer ON public.style_guides;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.style_guides;

ALTER TABLE public.style_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.style_guides
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.style_guides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.style_guides
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.style_guides
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- VISUAL_STYLE_GUIDES
DROP POLICY IF EXISTS visual_style_guides_select_system_admin ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_select_customer_admin ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_select_customer_success ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_insert_system_admin ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_insert_customer_admin ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_insert_customer_member ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_update_system_admin ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_update_customer_admin ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_update_customer_success ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_delete_system_admin ON public.visual_style_guides;
DROP POLICY IF EXISTS visual_style_guides_delete_customer_admin ON public.visual_style_guides;
DROP POLICY IF EXISTS policy_select_same_customer ON public.visual_style_guides;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.visual_style_guides;
DROP POLICY IF EXISTS policy_update_same_customer ON public.visual_style_guides;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.visual_style_guides;

ALTER TABLE public.visual_style_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.visual_style_guides
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.visual_style_guides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.visual_style_guides
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.visual_style_guides
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- =============================================================================
-- SECONDARY TABLES (CUSTOMER SCOPE) - RLS Policies
-- =============================================================================

-- FRAMING_CONCEPTS (references style_guides)
DROP POLICY IF EXISTS framing_concepts_select_system_admin ON public.framing_concepts;
DROP POLICY IF EXISTS framing_concepts_select_customer_admin ON public.framing_concepts;
DROP POLICY IF EXISTS framing_concepts_select_customer_success ON public.framing_concepts;
DROP POLICY IF EXISTS framing_concepts_insert_system_admin ON public.framing_concepts;
DROP POLICY IF EXISTS framing_concepts_insert_customer_admin ON public.framing_concepts;
DROP POLICY IF EXISTS framing_concepts_update_system_admin ON public.framing_concepts;
DROP POLICY IF EXISTS framing_concepts_update_customer_admin ON public.framing_concepts;
DROP POLICY IF EXISTS framing_concepts_delete_system_admin ON public.framing_concepts;
DROP POLICY IF EXISTS framing_concepts_delete_customer_admin ON public.framing_concepts;
DROP POLICY IF EXISTS policy_select_same_customer ON public.framing_concepts;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.framing_concepts;
DROP POLICY IF EXISTS policy_update_same_customer ON public.framing_concepts;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.framing_concepts;

ALTER TABLE public.framing_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.framing_concepts
  FOR SELECT
  TO authenticated
  USING (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  );

CREATE POLICY policy_insert_same_customer
  ON public.framing_concepts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  );

CREATE POLICY policy_update_same_customer
  ON public.framing_concepts
  FOR UPDATE
  TO authenticated
  USING (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  )
  WITH CHECK (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  );

CREATE POLICY policy_delete_same_customer
  ON public.framing_concepts
  FOR DELETE
  TO authenticated
  USING (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  );


-- COMPLIANCE_RULES (has customer_id)
DROP POLICY IF EXISTS compliance_rules_select_system_admin ON public.compliance_rules;
DROP POLICY IF EXISTS compliance_rules_select_customer_admin ON public.compliance_rules;
DROP POLICY IF EXISTS compliance_rules_select_customer_success ON public.compliance_rules;
DROP POLICY IF EXISTS compliance_rules_insert_system_admin ON public.compliance_rules;
DROP POLICY IF EXISTS compliance_rules_insert_customer_admin ON public.compliance_rules;
DROP POLICY IF EXISTS compliance_rules_update_system_admin ON public.compliance_rules;
DROP POLICY IF EXISTS compliance_rules_update_customer_admin ON public.compliance_rules;
DROP POLICY IF EXISTS compliance_rules_delete_system_admin ON public.compliance_rules;
DROP POLICY IF EXISTS compliance_rules_delete_customer_admin ON public.compliance_rules;
DROP POLICY IF EXISTS policy_select_same_customer ON public.compliance_rules;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.compliance_rules;
DROP POLICY IF EXISTS policy_update_same_customer ON public.compliance_rules;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.compliance_rules;

ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.compliance_rules
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.compliance_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.compliance_rules
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.compliance_rules
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- VOCABULARY_ENTRIES (references style_guides)
DROP POLICY IF EXISTS vocabulary_entries_select_system_admin ON public.vocabulary_entries;
DROP POLICY IF EXISTS vocabulary_entries_select_customer_admin ON public.vocabulary_entries;
DROP POLICY IF EXISTS vocabulary_entries_select_customer_success ON public.vocabulary_entries;
DROP POLICY IF EXISTS vocabulary_entries_insert_system_admin ON public.vocabulary_entries;
DROP POLICY IF EXISTS vocabulary_entries_insert_customer_admin ON public.vocabulary_entries;
DROP POLICY IF EXISTS vocabulary_entries_update_system_admin ON public.vocabulary_entries;
DROP POLICY IF EXISTS vocabulary_entries_update_customer_admin ON public.vocabulary_entries;
DROP POLICY IF EXISTS vocabulary_entries_delete_system_admin ON public.vocabulary_entries;
DROP POLICY IF EXISTS vocabulary_entries_delete_customer_admin ON public.vocabulary_entries;
DROP POLICY IF EXISTS policy_select_same_customer ON public.vocabulary_entries;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.vocabulary_entries;
DROP POLICY IF EXISTS policy_update_same_customer ON public.vocabulary_entries;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.vocabulary_entries;

ALTER TABLE public.vocabulary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.vocabulary_entries
  FOR SELECT
  TO authenticated
  USING (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  );

CREATE POLICY policy_insert_same_customer
  ON public.vocabulary_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  );

CREATE POLICY policy_update_same_customer
  ON public.vocabulary_entries
  FOR UPDATE
  TO authenticated
  USING (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  )
  WITH CHECK (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  );

CREATE POLICY policy_delete_same_customer
  ON public.vocabulary_entries
  FOR DELETE
  TO authenticated
  USING (
    style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    )
  );


-- LOGO_ASSETS (has customer_id)
DROP POLICY IF EXISTS logo_assets_select_system_admin ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_select_customer_admin ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_select_customer_success ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_insert_system_admin ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_insert_customer_admin ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_insert_customer_member ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_update_system_admin ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_update_customer_admin ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_update_customer_success ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_delete_system_admin ON public.logo_assets;
DROP POLICY IF EXISTS logo_assets_delete_customer_admin ON public.logo_assets;
DROP POLICY IF EXISTS policy_select_same_customer ON public.logo_assets;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.logo_assets;
DROP POLICY IF EXISTS policy_update_same_customer ON public.logo_assets;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.logo_assets;

ALTER TABLE public.logo_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.logo_assets
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.logo_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.logo_assets
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.logo_assets
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- PALETTE_COLORS (has customer_id)
DROP POLICY IF EXISTS palette_colors_select_system_admin ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_select_customer_admin ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_select_customer_success ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_insert_system_admin ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_insert_customer_admin ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_insert_customer_member ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_update_system_admin ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_update_customer_admin ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_update_customer_success ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_delete_system_admin ON public.palette_colors;
DROP POLICY IF EXISTS palette_colors_delete_customer_admin ON public.palette_colors;
DROP POLICY IF EXISTS policy_select_same_customer ON public.palette_colors;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.palette_colors;
DROP POLICY IF EXISTS policy_update_same_customer ON public.palette_colors;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.palette_colors;

ALTER TABLE public.palette_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.palette_colors
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.palette_colors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.palette_colors
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.palette_colors
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- TYPOGRAPHY_STYLES (has customer_id)
DROP POLICY IF EXISTS typography_styles_select_system_admin ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_select_customer_admin ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_select_customer_success ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_insert_system_admin ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_insert_customer_admin ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_insert_customer_member ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_update_system_admin ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_update_customer_admin ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_update_customer_success ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_delete_system_admin ON public.typography_styles;
DROP POLICY IF EXISTS typography_styles_delete_customer_admin ON public.typography_styles;
DROP POLICY IF EXISTS policy_select_same_customer ON public.typography_styles;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.typography_styles;
DROP POLICY IF EXISTS policy_update_same_customer ON public.typography_styles;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.typography_styles;

ALTER TABLE public.typography_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.typography_styles
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.typography_styles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.typography_styles
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.typography_styles
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- SOCIAL_TEMPLATES (has customer_id)
DROP POLICY IF EXISTS social_templates_select_system_admin ON public.social_templates;
DROP POLICY IF EXISTS social_templates_select_customer_admin ON public.social_templates;
DROP POLICY IF EXISTS social_templates_select_customer_success ON public.social_templates;
DROP POLICY IF EXISTS social_templates_insert_system_admin ON public.social_templates;
DROP POLICY IF EXISTS social_templates_insert_customer_admin ON public.social_templates;
DROP POLICY IF EXISTS social_templates_insert_customer_member ON public.social_templates;
DROP POLICY IF EXISTS social_templates_update_system_admin ON public.social_templates;
DROP POLICY IF EXISTS social_templates_update_customer_admin ON public.social_templates;
DROP POLICY IF EXISTS social_templates_update_customer_success ON public.social_templates;
DROP POLICY IF EXISTS social_templates_delete_system_admin ON public.social_templates;
DROP POLICY IF EXISTS social_templates_delete_customer_admin ON public.social_templates;
DROP POLICY IF EXISTS policy_select_same_customer ON public.social_templates;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.social_templates;
DROP POLICY IF EXISTS policy_update_same_customer ON public.social_templates;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.social_templates;

ALTER TABLE public.social_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.social_templates
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_insert_same_customer
  ON public.social_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_update_same_customer
  ON public.social_templates
  FOR UPDATE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  )
  WITH CHECK (
    public.can_access_customer(customer_id)
  );

CREATE POLICY policy_delete_same_customer
  ON public.social_templates
  FOR DELETE
  TO authenticated
  USING (
    public.can_access_customer(customer_id)
  );


-- =============================================================================
-- OTHER SCOPE TABLES - RLS Policies
-- =============================================================================

-- CONTENT_EVALUATIONS (references style_guides and visual_style_guides)
DROP POLICY IF EXISTS content_evaluations_select_system_admin ON public.content_evaluations;
DROP POLICY IF EXISTS content_evaluations_select_customer_success ON public.content_evaluations;
DROP POLICY IF EXISTS content_evaluations_select_customer ON public.content_evaluations;
DROP POLICY IF EXISTS content_evaluations_insert_system_admin ON public.content_evaluations;
DROP POLICY IF EXISTS content_evaluations_insert_creator ON public.content_evaluations;
DROP POLICY IF EXISTS content_evaluations_update_system_admin ON public.content_evaluations;
DROP POLICY IF EXISTS content_evaluations_update_creator ON public.content_evaluations;
DROP POLICY IF EXISTS content_evaluations_delete_system_admin ON public.content_evaluations;
DROP POLICY IF EXISTS policy_select_same_customer ON public.content_evaluations;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.content_evaluations;
DROP POLICY IF EXISTS policy_update_same_customer ON public.content_evaluations;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.content_evaluations;

ALTER TABLE public.content_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.content_evaluations
  FOR SELECT
  TO authenticated
  USING (
    (style_guide_id IS NULL OR style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    ))
    AND
    (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
      SELECT visual_style_guide_id FROM public.visual_style_guides
      WHERE public.can_access_customer(customer_id)
    ))
  );

CREATE POLICY policy_insert_same_customer
  ON public.content_evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (style_guide_id IS NULL OR style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    ))
    AND
    (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
      SELECT visual_style_guide_id FROM public.visual_style_guides
      WHERE public.can_access_customer(customer_id)
    ))
  );

CREATE POLICY policy_update_same_customer
  ON public.content_evaluations
  FOR UPDATE
  TO authenticated
  USING (
    (style_guide_id IS NULL OR style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    ))
    AND
    (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
      SELECT visual_style_guide_id FROM public.visual_style_guides
      WHERE public.can_access_customer(customer_id)
    ))
  )
  WITH CHECK (
    (style_guide_id IS NULL OR style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    ))
    AND
    (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
      SELECT visual_style_guide_id FROM public.visual_style_guides
      WHERE public.can_access_customer(customer_id)
    ))
  );

CREATE POLICY policy_delete_same_customer
  ON public.content_evaluations
  FOR DELETE
  TO authenticated
  USING (
    (style_guide_id IS NULL OR style_guide_id IN (
      SELECT style_guide_id FROM public.style_guides
      WHERE public.can_access_customer(customer_id)
    ))
    AND
    (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
      SELECT visual_style_guide_id FROM public.visual_style_guides
      WHERE public.can_access_customer(customer_id)
    ))
  );


-- EVALUATION_RULE_HITS (references content_evaluations)
DROP POLICY IF EXISTS evaluation_rule_hits_select_system_admin ON public.evaluation_rule_hits;
DROP POLICY IF EXISTS evaluation_rule_hits_select_by_evaluation ON public.evaluation_rule_hits;
DROP POLICY IF EXISTS evaluation_rule_hits_insert_system_admin ON public.evaluation_rule_hits;
DROP POLICY IF EXISTS evaluation_rule_hits_update_system_admin ON public.evaluation_rule_hits;
DROP POLICY IF EXISTS evaluation_rule_hits_delete_system_admin ON public.evaluation_rule_hits;
DROP POLICY IF EXISTS policy_select_same_customer ON public.evaluation_rule_hits;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.evaluation_rule_hits;
DROP POLICY IF EXISTS policy_update_same_customer ON public.evaluation_rule_hits;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.evaluation_rule_hits;

ALTER TABLE public.evaluation_rule_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.evaluation_rule_hits
  FOR SELECT
  TO authenticated
  USING (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  );

CREATE POLICY policy_insert_same_customer
  ON public.evaluation_rule_hits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  );

CREATE POLICY policy_update_same_customer
  ON public.evaluation_rule_hits
  FOR UPDATE
  TO authenticated
  USING (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  )
  WITH CHECK (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  );

CREATE POLICY policy_delete_same_customer
  ON public.evaluation_rule_hits
  FOR DELETE
  TO authenticated
  USING (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  );


-- COMPLIANCE_REVIEWS (references content_evaluations)
DROP POLICY IF EXISTS compliance_reviews_select_system_admin ON public.compliance_reviews;
DROP POLICY IF EXISTS compliance_reviews_select_customer_success ON public.compliance_reviews;
DROP POLICY IF EXISTS compliance_reviews_select_customer ON public.compliance_reviews;
DROP POLICY IF EXISTS compliance_reviews_insert_system_admin ON public.compliance_reviews;
DROP POLICY IF EXISTS compliance_reviews_insert_creator ON public.compliance_reviews;
DROP POLICY IF EXISTS compliance_reviews_update_system_admin ON public.compliance_reviews;
DROP POLICY IF EXISTS compliance_reviews_update_assigned_reviewer ON public.compliance_reviews;
DROP POLICY IF EXISTS compliance_reviews_update_customer_admin ON public.compliance_reviews;
DROP POLICY IF EXISTS compliance_reviews_delete_system_admin ON public.compliance_reviews;
DROP POLICY IF EXISTS policy_select_same_customer ON public.compliance_reviews;
DROP POLICY IF EXISTS policy_insert_same_customer ON public.compliance_reviews;
DROP POLICY IF EXISTS policy_update_same_customer ON public.compliance_reviews;
DROP POLICY IF EXISTS policy_delete_same_customer ON public.compliance_reviews;

ALTER TABLE public.compliance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_select_same_customer
  ON public.compliance_reviews
  FOR SELECT
  TO authenticated
  USING (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  );

CREATE POLICY policy_insert_same_customer
  ON public.compliance_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  );

CREATE POLICY policy_update_same_customer
  ON public.compliance_reviews
  FOR UPDATE
  TO authenticated
  USING (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  )
  WITH CHECK (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  );

CREATE POLICY policy_delete_same_customer
  ON public.compliance_reviews
  FOR DELETE
  TO authenticated
  USING (
    evaluation_id IN (
      SELECT evaluation_id FROM public.content_evaluations
      WHERE (
        (style_guide_id IS NULL OR style_guide_id IN (
          SELECT style_guide_id FROM public.style_guides
          WHERE public.can_access_customer(customer_id)
        ))
        AND
        (visual_style_guide_id IS NULL OR visual_style_guide_id IN (
          SELECT visual_style_guide_id FROM public.visual_style_guides
          WHERE public.can_access_customer(customer_id)
        ))
      )
    )
  );


-- =============================================================================
-- END OF STYLE GUIDE RLS POLICIES
-- =============================================================================
-- 
-- Summary:
-- - All existing policies dropped and recreated fresh
-- - RLS enabled on 24 tables:
--   Option Tables (System Scope):
--     - language_level_option_items
--     - use_of_jargon_option_items
--     - storytelling_option_items
--     - humor_usage_option_items
--     - pacing_option_items
--     - sentence_option_items_singleton
--     - formality_option_items
--     - compliance_rule_type_option_items
--     - typography_style_options
--     - logo_type_options
--     - font_options
--     - social_template_types
--   Primary Tables (Customer Scope):
--     - style_guides
--     - visual_style_guides
--   Secondary Tables (Customer Scope):
--     - framing_concepts
--     - compliance_rules
--     - vocabulary_entries
--     - logo_assets
--     - palette_colors
--     - typography_styles
--     - social_templates
--   Other Scope Tables:
--     - content_evaluations
--     - evaluation_rule_hits
--     - compliance_reviews
-- - Policies follow Baseplate naming convention: policy_action_name
-- - Tenant isolation via can_access_customer(target_customer_id) function
-- - System administrators can access all data (handled within can_access_customer())
-- - Customer success reps can access assigned customers via can_access_customer()
-- - Regular users can only access their own customer's data
-- =============================================================================
