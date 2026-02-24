-- =============================================================================
-- VOICELOCK FEATURE - STYLE GUIDE TABLES
-- Machine-readable written style guide system for Graviten
-- =============================================================================

-- =============================================================================
-- OPTION SINGLETON TABLES (System Scope)
-- =============================================================================

-- Language level option items (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.language_level_option_items (
  language_level_option_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

COMMENT ON TABLE public.language_level_option_items IS 
  'System-wide option items for recommended reading level / complexity';

COMMENT ON COLUMN public.language_level_option_items.name IS 
  'Internal identifier (e.g., "grade_8", "grade_10", "professional")';

-- Use of jargon option items (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.use_of_jargon_option_items (
  use_of_jargon_option_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

COMMENT ON TABLE public.use_of_jargon_option_items IS 
  'System-wide option items for acceptable jargon level';

-- Storytelling style option items (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.storytelling_option_items (
  storytelling_option_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

COMMENT ON TABLE public.storytelling_option_items IS 
  'System-wide option items for preferred storytelling style';

-- Humor usage option items (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.humor_usage_option_items (
  humor_usage_option_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

COMMENT ON TABLE public.humor_usage_option_items IS 
  'System-wide option items for allowed humor usage';

-- Pacing option items (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.pacing_option_items (
  pacing_option_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

COMMENT ON TABLE public.pacing_option_items IS 
  'System-wide option items for pacing preference';

-- Sentence length option items (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.sentence_option_items_singleton (
  sentence_option_items_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

COMMENT ON TABLE public.sentence_option_items_singleton IS 
  'System-wide option items for preferred sentence length guidance';

-- Formality option items (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.formality_option_items (
  formality_option_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

COMMENT ON TABLE public.formality_option_items IS 
  'System-wide option items for desired formality level';

-- Compliance rule type option items (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.compliance_rule_type_option_items (
  compliance_rule_type_option_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

COMMENT ON TABLE public.compliance_rule_type_option_items IS 
  'System-wide option items for compliance rule type classification';

-- =============================================================================
-- VISUALOS FEATURE - VISUAL STYLE GUIDE OPTION TABLES (System Scope)
-- =============================================================================

-- Typography style options (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.typography_style_options (
  typography_style_option_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.typography_style_options IS 
  'System-wide canonical set of typography roles (e.g., h1, h2, body, caption) used across all visual style guides';

COMMENT ON COLUMN public.typography_style_options.programmatic_name IS 
  'Internal identifier (e.g., "heading_1", "body_text", "caption")';

-- Logo type options (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.logo_type_options (
  logo_type_option_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.logo_type_options IS 
  'System-wide canonical set of logo types (e.g., primary, secondary, icon, wordmark)';

COMMENT ON COLUMN public.logo_type_options.programmatic_name IS 
  'Internal identifier (e.g., "primary_logo", "icon_only", "wordmark")';

-- Font options (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.font_options (
  font_option_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  source text,
  license_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.font_options IS 
  'System-wide catalog of available fonts with licensing information';

COMMENT ON COLUMN public.font_options.source IS 
  'Font source (e.g., "Google Fonts", "Adobe Fonts", "System")';

COMMENT ON COLUMN public.font_options.license_notes IS 
  'Licensing information and usage restrictions';

-- Social template types (singleton - system-wide)
CREATE TABLE IF NOT EXISTS public.social_template_types (
  social_template_type_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  network text NOT NULL,
  banner_dimensions jsonb,
  banner_design_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.social_template_types IS 
  'System-wide canonical set of social media template types with network-specific dimensions';

COMMENT ON COLUMN public.social_template_types.network IS 
  'Social network (linkedin, x, facebook, instagram)';

COMMENT ON COLUMN public.social_template_types.banner_dimensions IS 
  'JSON object containing width/height dimensions for the banner';

COMMENT ON COLUMN public.social_template_types.banner_design_json IS 
  'JSON template structure for rendering the social banner';

-- Constraint for network enum
ALTER TABLE public.social_template_types 
  DROP CONSTRAINT IF EXISTS social_template_types_network_check;
ALTER TABLE public.social_template_types 
  ADD CONSTRAINT social_template_types_network_check 
  CHECK (network IN ('linkedin', 'x', 'facebook', 'instagram'));

-- =============================================================================
-- PRIMARY TABLE: STYLE GUIDES (Customer Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.style_guides (
  style_guide_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  guide_name text NOT NULL DEFAULT '',
  brand_personality text,
  brand_voice text,
  formality_option_item_id uuid,
  sentence_length_option_item_id uuid,
  pacing_option_item_id uuid,
  humor_usage_option_item_id uuid,
  storytelling_style_option_item_id uuid,
  use_of_jargon_option_item_id uuid,
  language_level_option_item_id uuid,
  inclusivity_guidelines text,
  llm_prompt_template text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT style_guides_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT style_guides_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(user_id),
  CONSTRAINT style_guides_formality_option_item_id_fkey 
    FOREIGN KEY (formality_option_item_id) REFERENCES public.formality_option_items(formality_option_item_id),
  CONSTRAINT style_guides_sentence_length_option_item_id_fkey 
    FOREIGN KEY (sentence_length_option_item_id) REFERENCES public.sentence_option_items_singleton(sentence_option_items_id),
  CONSTRAINT style_guides_pacing_option_item_id_fkey 
    FOREIGN KEY (pacing_option_item_id) REFERENCES public.pacing_option_items(pacing_option_item_id),
  CONSTRAINT style_guides_humor_usage_option_item_id_fkey 
    FOREIGN KEY (humor_usage_option_item_id) REFERENCES public.humor_usage_option_items(humor_usage_option_item_id),
  CONSTRAINT style_guides_storytelling_style_option_item_id_fkey 
    FOREIGN KEY (storytelling_style_option_item_id) REFERENCES public.storytelling_option_items(storytelling_option_item_id),
  CONSTRAINT style_guides_use_of_jargon_option_item_id_fkey 
    FOREIGN KEY (use_of_jargon_option_item_id) REFERENCES public.use_of_jargon_option_items(use_of_jargon_option_item_id),
  CONSTRAINT style_guides_language_level_option_item_id_fkey 
    FOREIGN KEY (language_level_option_item_id) REFERENCES public.language_level_option_items(language_level_option_item_id),
  CONSTRAINT style_guides_customer_guide_name_unique UNIQUE (customer_id, guide_name)
);

COMMENT ON TABLE public.style_guides IS 
  'The authoritative, customer-scoped machine-readable written style guide';

COMMENT ON COLUMN public.style_guides.guide_name IS 
  'Human-readable name for the style guide (e.g., "Graviten Brand Voice – Mortgage Group")';

COMMENT ON COLUMN public.style_guides.active IS 
  'Whether this style guide is currently active for the customer. Only one active style guide expected per customer in MVP';

COMMENT ON COLUMN public.style_guides.llm_prompt_template IS 
  'Reusable LLM prompt template that instructs the Graviten AI to generate content consistent with this style guide';

COMMENT ON COLUMN public.style_guides.inclusivity_guidelines IS 
  'Machine-readable summary of inclusivity constraints and principal rules';

COMMENT ON COLUMN public.style_guides.brand_voice IS 
  'Comma-separated list of voice attributes (e.g., "Trustworthy, Conversational, Confident")';

-- =============================================================================
-- PRIMARY TABLE: VISUAL STYLE GUIDES (Customer Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.visual_style_guides (
  visual_style_guide_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  description text,
  default_logo_asset_id uuid,
  imagery_guidelines text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT visual_style_guides_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT visual_style_guides_customer_name_unique 
    UNIQUE (customer_id, name)
);

COMMENT ON TABLE public.visual_style_guides IS 
  'Primary record for a customer''s visual brand identity and design system';

COMMENT ON COLUMN public.visual_style_guides.name IS 
  'Human-readable name for the visual style guide (e.g., "Graviten Brand Guide 2024")';

COMMENT ON COLUMN public.visual_style_guides.default_logo_asset_id IS 
  'Reference to the primary/default logo asset to use across marketing materials';

COMMENT ON COLUMN public.visual_style_guides.imagery_guidelines IS 
  'Text guidelines for photography style, image treatment, and visual direction';

-- =============================================================================
-- SECONDARY TABLE: FRAMING CONCEPTS (Customer Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.framing_concepts (
  framing_concept_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_guide_id uuid NOT NULL,
  written_style_guide_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  description text,
  example_usage text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT framing_concepts_style_guide_id_fkey 
    FOREIGN KEY (style_guide_id) REFERENCES public.style_guides(style_guide_id) ON DELETE CASCADE,
  CONSTRAINT framing_concepts_written_style_guide_id_fkey 
    FOREIGN KEY (written_style_guide_id) REFERENCES public.style_guides(style_guide_id) ON DELETE CASCADE,
  CONSTRAINT framing_concepts_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(user_id),
  CONSTRAINT framing_concepts_style_guide_id_match 
    CHECK (style_guide_id = written_style_guide_id)
);

COMMENT ON TABLE public.framing_concepts IS 
  'Customer-scoped table storing metaphors and framing options used to shape narrative framing';

COMMENT ON COLUMN public.framing_concepts.name IS 
  'Short name for the framing concept (e.g., "Home as Security")';

COMMENT ON COLUMN public.framing_concepts.description IS 
  'Long-form description explaining how to apply the metaphor or framing in content';

COMMENT ON COLUMN public.framing_concepts.example_usage IS 
  'Example of how to use this framing concept in content';

-- =============================================================================
-- SECONDARY TABLE: COMPLIANCE RULES (Customer Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.compliance_rules (
  compliance_rule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  style_guide_id uuid,
  compliance_rule_type_option_item_id uuid,
  name text NOT NULL DEFAULT '',
  rule_name text NOT NULL DEFAULT '',
  description text,
  rule_definition_json jsonb,
  rule_replacement text,
  severity_level integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  is_blocking boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT compliance_rules_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT compliance_rules_style_guide_id_fkey 
    FOREIGN KEY (style_guide_id) REFERENCES public.style_guides(style_guide_id) ON DELETE CASCADE,
  CONSTRAINT compliance_rules_compliance_rule_type_option_item_id_fkey 
    FOREIGN KEY (compliance_rule_type_option_item_id) REFERENCES public.compliance_rule_type_option_items(compliance_rule_type_option_item_id),
  CONSTRAINT compliance_rules_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(user_id),
  CONSTRAINT compliance_rules_severity_level_check 
    CHECK (severity_level >= 1 AND severity_level <= 3),
  CONSTRAINT compliance_rules_name_rule_name_match 
    CHECK (name = rule_name OR rule_name = '')
);

COMMENT ON TABLE public.compliance_rules IS 
  'Customer-specific granular compliance rules checked by the evaluation engine';

COMMENT ON COLUMN public.compliance_rules.severity_level IS 
  'Severity: 1=info, 2=warning, 3=blocker';

COMMENT ON COLUMN public.compliance_rules.is_blocking IS 
  'Denormalized flag indicating whether the rule should block publishing flows';

COMMENT ON COLUMN public.compliance_rules.is_active IS 
  'Whether this compliance rule is currently active';

COMMENT ON COLUMN public.compliance_rules.rule_replacement IS 
  'Suggested replacement text or strategy when the rule is violated';

COMMENT ON COLUMN public.compliance_rules.rule_definition_json IS 
  'JSON object containing the rule definition and configuration';

-- =============================================================================
-- SECONDARY TABLE: VOCABULARY ENTRIES (Customer Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vocabulary_entries (
  vocabulary_entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_guide_id uuid NOT NULL,
  written_style_guide_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  vocabulary_type text NOT NULL DEFAULT 'preferred',
  suggested_replacement text,
  example_usage text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT vocabulary_entries_style_guide_id_fkey 
    FOREIGN KEY (style_guide_id) REFERENCES public.style_guides(style_guide_id) ON DELETE CASCADE,
  CONSTRAINT vocabulary_entries_written_style_guide_id_fkey 
    FOREIGN KEY (written_style_guide_id) REFERENCES public.style_guides(style_guide_id) ON DELETE CASCADE,
  CONSTRAINT vocabulary_entries_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(user_id),
  CONSTRAINT vocabulary_entries_type_check 
    CHECK (vocabulary_type IN ('preferred', 'prohibited', 'neutral')),
  CONSTRAINT vocabulary_entries_style_guide_id_match 
    CHECK (style_guide_id = written_style_guide_id)
);

COMMENT ON TABLE public.vocabulary_entries IS 
  'Customer-specific vocabulary registry storing preferred, prohibited, and neutral terms/phrases';

COMMENT ON COLUMN public.vocabulary_entries.vocabulary_type IS 
  'Type: preferred, prohibited, or neutral';

COMMENT ON COLUMN public.vocabulary_entries.name IS 
  'The vocabulary token or phrase (single word or multi-word phrase) to be indexed';

COMMENT ON COLUMN public.vocabulary_entries.example_usage IS 
  'Example of how to use this vocabulary entry in content';

-- =============================================================================
-- SECONDARY TABLE: LOGO ASSETS (Customer Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.logo_assets (
  logo_asset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  visual_style_guide_id uuid NOT NULL,
  logo_type_option_id uuid NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_vector boolean NOT NULL DEFAULT false,
  is_circular_crop boolean NOT NULL DEFAULT false,
  circular_safe_area jsonb,
  width integer,
  height integer,
  svg_text text,
  file_blob text,
  storage_path text,
  file_url text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT logo_assets_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT logo_assets_visual_style_guide_id_fkey 
    FOREIGN KEY (visual_style_guide_id) REFERENCES public.visual_style_guides(visual_style_guide_id) ON DELETE CASCADE,
  CONSTRAINT logo_assets_logo_type_option_id_fkey 
    FOREIGN KEY (logo_type_option_id) REFERENCES public.logo_type_options(logo_type_option_id),
  CONSTRAINT logo_assets_created_by_user_id_fkey 
    FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
);

COMMENT ON TABLE public.logo_assets IS 
  'Uploaded or extracted logo files associated with a visual style guide';

COMMENT ON COLUMN public.logo_assets.is_vector IS 
  'Whether the logo is in vector format (SVG)';

COMMENT ON COLUMN public.logo_assets.is_circular_crop IS 
  'Whether logo should be displayed with circular crop (e.g., for profile images)';

COMMENT ON COLUMN public.logo_assets.circular_safe_area IS 
  'JSON object defining safe area coordinates for circular crops';

COMMENT ON COLUMN public.logo_assets.svg_text IS 
  'Raw SVG markup if logo is vector format';

COMMENT ON COLUMN public.logo_assets.file_blob IS 
  'Base64-encoded image data (for small logos)';

COMMENT ON COLUMN public.logo_assets.storage_path IS 
  'Path to logo file in storage bucket';

COMMENT ON COLUMN public.logo_assets.file_url IS 
  'Public URL to access the logo file';

-- =============================================================================
-- SECONDARY TABLE: PALETTE COLORS (Customer Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.palette_colors (
  palette_color_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  style_guide_id uuid,
  hex text NOT NULL,
  name text,
  usage_option text NOT NULL DEFAULT 'primary',
  sort_order integer NOT NULL DEFAULT 0,
  contrast_ratio_against_background numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT palette_colors_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT palette_colors_style_guide_id_fkey 
    FOREIGN KEY (style_guide_id) REFERENCES public.visual_style_guides(visual_style_guide_id) ON DELETE CASCADE,
  CONSTRAINT palette_colors_hex_format_check 
    CHECK (hex ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
  CONSTRAINT palette_colors_usage_option_check 
    CHECK (usage_option IN ('primary', 'neutral', 'danger', 'success', 'warning'))
);

COMMENT ON TABLE public.palette_colors IS 
  'Individual brand colors with intended usage, contrast ratios, and semantic meanings';

COMMENT ON COLUMN public.palette_colors.hex IS 
  'Hex color code in format #RGB or #RRGGBB';

COMMENT ON COLUMN public.palette_colors.usage_option IS 
  'Semantic usage category (JoyUI): primary, neutral, danger, success, warning';

COMMENT ON COLUMN public.palette_colors.contrast_ratio_against_background IS 
  'WCAG contrast ratio when used against typical background colors';

COMMENT ON COLUMN public.palette_colors.sort_order IS 
  'Display order for color palette visualization';

-- =============================================================================
-- SECONDARY TABLE: TYPOGRAPHY STYLES (Customer Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.typography_styles (
  typography_style_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  visual_style_guide_id uuid NOT NULL,
  typography_style_option_id uuid NOT NULL,
  font_option_id uuid,
  font_family text NOT NULL,
  font_fallbacks text,
  font_size_px integer NOT NULL,
  line_height numeric,
  font_weight text,
  color text,
  css_snippet text,
  licensing_notes text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT typography_styles_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT typography_styles_visual_style_guide_id_fkey 
    FOREIGN KEY (visual_style_guide_id) REFERENCES public.visual_style_guides(visual_style_guide_id) ON DELETE CASCADE,
  CONSTRAINT typography_styles_typography_style_option_id_fkey 
    FOREIGN KEY (typography_style_option_id) REFERENCES public.typography_style_options(typography_style_option_id),
  CONSTRAINT typography_styles_font_option_id_fkey 
    FOREIGN KEY (font_option_id) REFERENCES public.font_options(font_option_id),
  CONSTRAINT typography_styles_created_by_user_id_fkey 
    FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id),
  CONSTRAINT typography_styles_color_format_check 
    CHECK (color IS NULL OR color ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
  CONSTRAINT typography_styles_font_size_positive_check 
    CHECK (font_size_px > 0)
);

COMMENT ON TABLE public.typography_styles IS 
  'Typographic rules per canonical role (h1, h2, body, etc.) within a visual style guide';

COMMENT ON COLUMN public.typography_styles.typography_style_option_id IS 
  'Reference to the canonical typography role (e.g., heading_1, body_text)';

COMMENT ON COLUMN public.typography_styles.font_family IS 
  'Primary font family name (e.g., "Inter", "Roboto")';

COMMENT ON COLUMN public.typography_styles.font_fallbacks IS 
  'Comma-separated list of fallback fonts (e.g., "Arial, sans-serif")';

COMMENT ON COLUMN public.typography_styles.font_size_px IS 
  'Font size in pixels';

COMMENT ON COLUMN public.typography_styles.line_height IS 
  'Line height multiplier (e.g., 1.5) or unitless value';

COMMENT ON COLUMN public.typography_styles.css_snippet IS 
  'Complete CSS declaration for this typography style';

-- =============================================================================
-- SECONDARY TABLE: SOCIAL TEMPLATES (Customer Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.social_templates (
  social_template_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  visual_style_guide_id uuid NOT NULL,
  social_template_type_id uuid NOT NULL,
  default_copy text,
  default_hashtags jsonb,
  design_tokens jsonb,
  is_locked boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT social_templates_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT social_templates_visual_style_guide_id_fkey 
    FOREIGN KEY (visual_style_guide_id) REFERENCES public.visual_style_guides(visual_style_guide_id) ON DELETE CASCADE,
  CONSTRAINT social_templates_social_template_type_id_fkey 
    FOREIGN KEY (social_template_type_id) REFERENCES public.social_template_types(social_template_type_id),
  CONSTRAINT social_templates_created_by_user_id_fkey 
    FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id)
);

COMMENT ON TABLE public.social_templates IS 
  'Derived social media banner templates per network, generated from visual style guide';

COMMENT ON COLUMN public.social_templates.default_copy IS 
  'Default text/copy to use in social media posts with this template';

COMMENT ON COLUMN public.social_templates.default_hashtags IS 
  'JSON array of default hashtags for posts using this template';

COMMENT ON COLUMN public.social_templates.design_tokens IS 
  'JSON object containing design tokens for programmatic rendering';

COMMENT ON COLUMN public.social_templates.is_locked IS 
  'Whether template is locked from editing (approved/published state)';

-- =============================================================================
-- SECONDARY TABLE: CONTENT EVALUATIONS (Other Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.content_evaluations (
  evaluation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_guide_id uuid,
  written_style_guide_id uuid,
  visual_style_guide_id uuid,
  content_id uuid,
  evaluation_status text NOT NULL DEFAULT 'pending',
  overall_score numeric,
  overall_severity integer NOT NULL DEFAULT 1,
  blocked boolean NOT NULL DEFAULT false,
  issues_count integer NOT NULL DEFAULT 0,
  autofix_suggestion text,
  evaluation_json jsonb,
  rule_hits_json jsonb,
  evaluation_metadata_json jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT content_evaluations_style_guide_id_fkey 
    FOREIGN KEY (style_guide_id) REFERENCES public.style_guides(style_guide_id),
  CONSTRAINT content_evaluations_written_style_guide_id_fkey 
    FOREIGN KEY (written_style_guide_id) REFERENCES public.style_guides(style_guide_id),
  CONSTRAINT content_evaluations_visual_style_guide_id_fkey 
    FOREIGN KEY (visual_style_guide_id) REFERENCES public.visual_style_guides(visual_style_guide_id),
  CONSTRAINT content_evaluations_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(user_id),
  CONSTRAINT content_evaluations_severity_check 
    CHECK (overall_severity >= 1 AND overall_severity <= 3),
  CONSTRAINT content_evaluations_status_check 
    CHECK (evaluation_status IN ('pending', 'in_progress', 'completed', 'failed')),
  CONSTRAINT content_evaluations_style_guide_id_match 
    CHECK (style_guide_id IS NULL OR written_style_guide_id IS NULL OR style_guide_id = written_style_guide_id)
);

COMMENT ON TABLE public.content_evaluations IS 
  'Evaluation runs performed when a composition is saved';

COMMENT ON COLUMN public.content_evaluations.overall_severity IS 
  'Aggregate severity: 1=info, 2=warning, 3=blocker';

COMMENT ON COLUMN public.content_evaluations.evaluation_json IS 
  'Raw structured output from the evaluation engine (rule hits, positions, matched text, etc.)';

COMMENT ON COLUMN public.content_evaluations.rule_hits_json IS 
  'JSON array of rule hits found during evaluation';

COMMENT ON COLUMN public.content_evaluations.evaluation_metadata_json IS 
  'JSON object containing metadata about the evaluation run';

COMMENT ON COLUMN public.content_evaluations.evaluation_status IS 
  'Status of the evaluation: pending, in_progress, completed, failed';

COMMENT ON COLUMN public.content_evaluations.overall_score IS 
  'Overall quality score (0-100) for the evaluated content';

COMMENT ON COLUMN public.content_evaluations.completed_at IS 
  'Timestamp when the evaluation was completed';

-- =============================================================================
-- SECONDARY TABLE: EVALUATION RULE HITS (Other Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.evaluation_rule_hits (
  rule_hit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL,
  compliance_rule_id uuid,
  vocabulary_entry_id uuid,
  framing_concept_id uuid,
  rule_name text NOT NULL DEFAULT '',
  matched_text text,
  suggested_replacement text,
  suggestion text,
  severity_level integer NOT NULL DEFAULT 1,
  is_blocking boolean NOT NULL DEFAULT false,
  location jsonb,
  rule_metadata_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT evaluation_rule_hits_evaluation_id_fkey 
    FOREIGN KEY (evaluation_id) REFERENCES public.content_evaluations(evaluation_id) ON DELETE CASCADE,
  CONSTRAINT evaluation_rule_hits_compliance_rule_id_fkey 
    FOREIGN KEY (compliance_rule_id) REFERENCES public.compliance_rules(compliance_rule_id),
  CONSTRAINT evaluation_rule_hits_vocabulary_entry_id_fkey 
    FOREIGN KEY (vocabulary_entry_id) REFERENCES public.vocabulary_entries(vocabulary_entry_id),
  CONSTRAINT evaluation_rule_hits_framing_concept_id_fkey 
    FOREIGN KEY (framing_concept_id) REFERENCES public.framing_concepts(framing_concept_id),
  CONSTRAINT evaluation_rule_hits_severity_check 
    CHECK (severity_level >= 1 AND severity_level <= 3),
  CONSTRAINT evaluation_rule_hits_suggestion_match 
    CHECK (suggestion IS NULL OR suggested_replacement IS NULL OR suggestion = suggested_replacement)
);

COMMENT ON TABLE public.evaluation_rule_hits IS 
  'Detailed, per-issue records recorded during an evaluation run';

COMMENT ON COLUMN public.evaluation_rule_hits.location IS 
  'Structured positional information (e.g., {"start": 54, "end": 78}) for inline highlights';

COMMENT ON COLUMN public.evaluation_rule_hits.matched_text IS 
  'The exact substring or phrase in the content that triggered this hit';

COMMENT ON COLUMN public.evaluation_rule_hits.rule_name IS 
  'Name of the rule that was violated';

COMMENT ON COLUMN public.evaluation_rule_hits.suggestion IS 
  'Suggested replacement or fix for the rule violation';

COMMENT ON COLUMN public.evaluation_rule_hits.rule_metadata_json IS 
  'JSON object containing additional metadata about the rule hit';

-- =============================================================================
-- SECONDARY TABLE: COMPLIANCE REVIEWS (Other Scope)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.compliance_reviews (
  compliance_review_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL,
  content_id uuid,
  assigned_reviewer_id uuid,
  status text NOT NULL DEFAULT 'pending',
  action_notes text,
  llm_rewrite_suggestion text,
  requested_changes_json jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  
  CONSTRAINT compliance_reviews_evaluation_id_fkey 
    FOREIGN KEY (evaluation_id) REFERENCES public.content_evaluations(evaluation_id) ON DELETE CASCADE,
  CONSTRAINT compliance_reviews_assigned_reviewer_id_fkey 
    FOREIGN KEY (assigned_reviewer_id) REFERENCES public.users(user_id),
  CONSTRAINT compliance_reviews_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(user_id),
  CONSTRAINT compliance_reviews_status_check 
    CHECK (status IN ('pending', 'approved', 'request_changes', 'blocked'))
);

COMMENT ON TABLE public.compliance_reviews IS 
  'Records representing items surfaced to compliance reviewers';

COMMENT ON COLUMN public.compliance_reviews.status IS 
  'Review status: pending, approved, request_changes, blocked';

COMMENT ON COLUMN public.compliance_reviews.requested_changes_json IS 
  'Structured list of requested change items';

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Style guides indexes
CREATE INDEX IF NOT EXISTS idx_style_guides_customer_id ON public.style_guides(customer_id);
CREATE INDEX IF NOT EXISTS idx_style_guides_active ON public.style_guides(customer_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_style_guides_created_by ON public.style_guides(created_by);

-- Framing concepts indexes
CREATE INDEX IF NOT EXISTS idx_framing_concepts_style_guide_id ON public.framing_concepts(style_guide_id);
CREATE INDEX IF NOT EXISTS idx_framing_concepts_written_style_guide_id ON public.framing_concepts(written_style_guide_id);
CREATE INDEX IF NOT EXISTS idx_framing_concepts_created_by ON public.framing_concepts(created_by);

-- Compliance rules indexes
CREATE INDEX IF NOT EXISTS idx_compliance_rules_customer_id ON public.compliance_rules(customer_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_style_guide_id ON public.compliance_rules(style_guide_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_severity ON public.compliance_rules(severity_level);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_is_blocking ON public.compliance_rules(is_blocking);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_is_active ON public.compliance_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_created_by ON public.compliance_rules(created_by);

-- Vocabulary entries indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_entries_style_guide_id ON public.vocabulary_entries(style_guide_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_entries_written_style_guide_id ON public.vocabulary_entries(written_style_guide_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_entries_type ON public.vocabulary_entries(vocabulary_type);
CREATE INDEX IF NOT EXISTS idx_vocabulary_entries_name ON public.vocabulary_entries(name);
CREATE INDEX IF NOT EXISTS idx_vocabulary_entries_created_by ON public.vocabulary_entries(created_by);

-- Content evaluations indexes
CREATE INDEX IF NOT EXISTS idx_content_evaluations_style_guide_id ON public.content_evaluations(style_guide_id);
CREATE INDEX IF NOT EXISTS idx_content_evaluations_written_style_guide_id ON public.content_evaluations(written_style_guide_id);
CREATE INDEX IF NOT EXISTS idx_content_evaluations_visual_style_guide_id ON public.content_evaluations(visual_style_guide_id);
CREATE INDEX IF NOT EXISTS idx_content_evaluations_content_id ON public.content_evaluations(content_id);
CREATE INDEX IF NOT EXISTS idx_content_evaluations_blocked ON public.content_evaluations(blocked);
CREATE INDEX IF NOT EXISTS idx_content_evaluations_severity ON public.content_evaluations(overall_severity);
CREATE INDEX IF NOT EXISTS idx_content_evaluations_status ON public.content_evaluations(evaluation_status);
CREATE INDEX IF NOT EXISTS idx_content_evaluations_evaluated_at ON public.content_evaluations(evaluated_at);
CREATE INDEX IF NOT EXISTS idx_content_evaluations_created_by ON public.content_evaluations(created_by);

-- Evaluation rule hits indexes
CREATE INDEX IF NOT EXISTS idx_evaluation_rule_hits_evaluation_id ON public.evaluation_rule_hits(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_rule_hits_compliance_rule_id ON public.evaluation_rule_hits(compliance_rule_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_rule_hits_vocabulary_entry_id ON public.evaluation_rule_hits(vocabulary_entry_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_rule_hits_severity ON public.evaluation_rule_hits(severity_level);
CREATE INDEX IF NOT EXISTS idx_evaluation_rule_hits_is_blocking ON public.evaluation_rule_hits(is_blocking);

-- Compliance reviews indexes
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_evaluation_id ON public.compliance_reviews(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_content_id ON public.compliance_reviews(content_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_assigned_reviewer_id ON public.compliance_reviews(assigned_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_status ON public.compliance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_created_by ON public.compliance_reviews(created_by);

-- Option singleton table indexes
CREATE INDEX IF NOT EXISTS idx_language_level_option_items_active ON public.language_level_option_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_use_of_jargon_option_items_active ON public.use_of_jargon_option_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_storytelling_option_items_active ON public.storytelling_option_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_humor_usage_option_items_active ON public.humor_usage_option_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pacing_option_items_active ON public.pacing_option_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sentence_option_items_singleton_active ON public.sentence_option_items_singleton(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_formality_option_items_active ON public.formality_option_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_compliance_rule_type_option_items_active ON public.compliance_rule_type_option_items(is_active) WHERE is_active = true;

-- Visual style guides indexes
CREATE INDEX IF NOT EXISTS idx_visual_style_guides_customer_id ON public.visual_style_guides(customer_id);

-- Logo assets indexes
CREATE INDEX IF NOT EXISTS idx_logo_assets_customer_id ON public.logo_assets(customer_id);
CREATE INDEX IF NOT EXISTS idx_logo_assets_visual_style_guide_id ON public.logo_assets(visual_style_guide_id);
CREATE INDEX IF NOT EXISTS idx_logo_assets_logo_type_option_id ON public.logo_assets(logo_type_option_id);
CREATE INDEX IF NOT EXISTS idx_logo_assets_is_default ON public.logo_assets(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_logo_assets_created_by_user_id ON public.logo_assets(created_by_user_id);

-- Palette colors indexes
CREATE INDEX IF NOT EXISTS idx_palette_colors_customer_id ON public.palette_colors(customer_id);
CREATE INDEX IF NOT EXISTS idx_palette_colors_style_guide_id ON public.palette_colors(style_guide_id);
CREATE INDEX IF NOT EXISTS idx_palette_colors_sort_order ON public.palette_colors(sort_order);
CREATE INDEX IF NOT EXISTS idx_palette_colors_usage_option ON public.palette_colors(usage_option);

-- Typography styles indexes
CREATE INDEX IF NOT EXISTS idx_typography_styles_customer_id ON public.typography_styles(customer_id);
CREATE INDEX IF NOT EXISTS idx_typography_styles_visual_style_guide_id ON public.typography_styles(visual_style_guide_id);
CREATE INDEX IF NOT EXISTS idx_typography_styles_typography_style_option_id ON public.typography_styles(typography_style_option_id);
CREATE INDEX IF NOT EXISTS idx_typography_styles_created_by_user_id ON public.typography_styles(created_by_user_id);

-- Social templates indexes
CREATE INDEX IF NOT EXISTS idx_social_templates_customer_id ON public.social_templates(customer_id);
CREATE INDEX IF NOT EXISTS idx_social_templates_visual_style_guide_id ON public.social_templates(visual_style_guide_id);
CREATE INDEX IF NOT EXISTS idx_social_templates_social_template_type_id ON public.social_templates(social_template_type_id);
CREATE INDEX IF NOT EXISTS idx_social_templates_is_locked ON public.social_templates(is_locked);
CREATE INDEX IF NOT EXISTS idx_social_templates_created_by_user_id ON public.social_templates(created_by_user_id);

-- Visual style guide option singleton table indexes
CREATE INDEX IF NOT EXISTS idx_typography_style_options_active ON public.typography_style_options(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_typography_style_options_sort_order ON public.typography_style_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_logo_type_options_active ON public.logo_type_options(is_active) WHERE is_active = true;

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

DROP TRIGGER IF EXISTS update_style_guides_updated_at ON public.style_guides;
CREATE TRIGGER update_style_guides_updated_at
  BEFORE UPDATE ON public.style_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_framing_concepts_updated_at ON public.framing_concepts;
CREATE TRIGGER update_framing_concepts_updated_at
  BEFORE UPDATE ON public.framing_concepts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_rules_updated_at ON public.compliance_rules;
CREATE TRIGGER update_compliance_rules_updated_at
  BEFORE UPDATE ON public.compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vocabulary_entries_updated_at ON public.vocabulary_entries;
CREATE TRIGGER update_vocabulary_entries_updated_at
  BEFORE UPDATE ON public.vocabulary_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_evaluations_updated_at ON public.content_evaluations;
CREATE TRIGGER update_content_evaluations_updated_at
  BEFORE UPDATE ON public.content_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_evaluation_rule_hits_updated_at ON public.evaluation_rule_hits;
CREATE TRIGGER update_evaluation_rule_hits_updated_at
  BEFORE UPDATE ON public.evaluation_rule_hits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_reviews_updated_at ON public.compliance_reviews;
CREATE TRIGGER update_compliance_reviews_updated_at
  BEFORE UPDATE ON public.compliance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_language_level_option_items_updated_at ON public.language_level_option_items;
CREATE TRIGGER update_language_level_option_items_updated_at
  BEFORE UPDATE ON public.language_level_option_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_use_of_jargon_option_items_updated_at ON public.use_of_jargon_option_items;
CREATE TRIGGER update_use_of_jargon_option_items_updated_at
  BEFORE UPDATE ON public.use_of_jargon_option_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_storytelling_option_items_updated_at ON public.storytelling_option_items;
CREATE TRIGGER update_storytelling_option_items_updated_at
  BEFORE UPDATE ON public.storytelling_option_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_humor_usage_option_items_updated_at ON public.humor_usage_option_items;
CREATE TRIGGER update_humor_usage_option_items_updated_at
  BEFORE UPDATE ON public.humor_usage_option_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pacing_option_items_updated_at ON public.pacing_option_items;
CREATE TRIGGER update_pacing_option_items_updated_at
  BEFORE UPDATE ON public.pacing_option_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sentence_option_items_singleton_updated_at ON public.sentence_option_items_singleton;
CREATE TRIGGER update_sentence_option_items_singleton_updated_at
  BEFORE UPDATE ON public.sentence_option_items_singleton
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_formality_option_items_updated_at ON public.formality_option_items;
CREATE TRIGGER update_formality_option_items_updated_at
  BEFORE UPDATE ON public.formality_option_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_rule_type_option_items_updated_at ON public.compliance_rule_type_option_items;
CREATE TRIGGER update_compliance_rule_type_option_items_updated_at
  BEFORE UPDATE ON public.compliance_rule_type_option_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_visual_style_guides_updated_at ON public.visual_style_guides;
CREATE TRIGGER update_visual_style_guides_updated_at
  BEFORE UPDATE ON public.visual_style_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_typography_style_options_updated_at ON public.typography_style_options;
CREATE TRIGGER update_typography_style_options_updated_at
  BEFORE UPDATE ON public.typography_style_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- TRIGGERS FOR SYNCING ALIAS COLUMNS
-- =============================================================================

-- Sync written_style_guide_id with style_guide_id in framing_concepts
CREATE OR REPLACE FUNCTION sync_framing_concepts_written_style_guide_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.written_style_guide_id IS NULL OR NEW.written_style_guide_id != NEW.style_guide_id THEN
    NEW.written_style_guide_id := NEW.style_guide_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_framing_concepts_written_style_guide_id_trigger ON public.framing_concepts;
CREATE TRIGGER sync_framing_concepts_written_style_guide_id_trigger
  BEFORE INSERT OR UPDATE ON public.framing_concepts
  FOR EACH ROW EXECUTE FUNCTION sync_framing_concepts_written_style_guide_id();

-- Sync written_style_guide_id with style_guide_id in vocabulary_entries
CREATE OR REPLACE FUNCTION sync_vocabulary_entries_written_style_guide_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.written_style_guide_id IS NULL OR NEW.written_style_guide_id != NEW.style_guide_id THEN
    NEW.written_style_guide_id := NEW.style_guide_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_vocabulary_entries_written_style_guide_id_trigger ON public.vocabulary_entries;
CREATE TRIGGER sync_vocabulary_entries_written_style_guide_id_trigger
  BEFORE INSERT OR UPDATE ON public.vocabulary_entries
  FOR EACH ROW EXECUTE FUNCTION sync_vocabulary_entries_written_style_guide_id();

-- Sync written_style_guide_id with style_guide_id in content_evaluations
CREATE OR REPLACE FUNCTION sync_content_evaluations_written_style_guide_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.style_guide_id IS NOT NULL AND (NEW.written_style_guide_id IS NULL OR NEW.written_style_guide_id != NEW.style_guide_id) THEN
    NEW.written_style_guide_id := NEW.style_guide_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_content_evaluations_written_style_guide_id_trigger ON public.content_evaluations;
CREATE TRIGGER sync_content_evaluations_written_style_guide_id_trigger
  BEFORE INSERT OR UPDATE ON public.content_evaluations
  FOR EACH ROW EXECUTE FUNCTION sync_content_evaluations_written_style_guide_id();

-- Sync rule_name with name in compliance_rules
CREATE OR REPLACE FUNCTION sync_compliance_rules_rule_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rule_name IS NULL OR NEW.rule_name = '' OR NEW.rule_name != NEW.name THEN
    NEW.rule_name := NEW.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_compliance_rules_rule_name_trigger ON public.compliance_rules;
CREATE TRIGGER sync_compliance_rules_rule_name_trigger
  BEFORE INSERT OR UPDATE ON public.compliance_rules
  FOR EACH ROW EXECUTE FUNCTION sync_compliance_rules_rule_name();

-- Sync suggestion with suggested_replacement in evaluation_rule_hits
CREATE OR REPLACE FUNCTION sync_evaluation_rule_hits_suggestion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.suggested_replacement IS NOT NULL AND (NEW.suggestion IS NULL OR NEW.suggestion != NEW.suggested_replacement) THEN
    NEW.suggestion := NEW.suggested_replacement;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_evaluation_rule_hits_suggestion_trigger ON public.evaluation_rule_hits;
CREATE TRIGGER sync_evaluation_rule_hits_suggestion_trigger
  BEFORE INSERT OR UPDATE ON public.evaluation_rule_hits
  FOR EACH ROW EXECUTE FUNCTION sync_evaluation_rule_hits_suggestion();

-- =============================================================================
-- INSERT DEFAULT OPTION VALUES
-- =============================================================================

-- Language level defaults
INSERT INTO public.language_level_option_items (name, display_name, description, sort_order) VALUES
  ('basic', 'Basic', 'Simple vocabulary, short sentences, and basic concepts (Grade level: 3-5)', 1),
  ('intermediate', 'Intermediate', 'Moderate vocabulary, varied sentence structures, and some technical terms (Grade level: 6-8)', 2),
  ('advanced', 'Advanced', 'Complex vocabulary, intricate sentence structures, and specialized technical terms (Grade level: 9-12)', 3),
  ('specialized', 'Specialized', 'Highly technical vocabulary, dense concepts, and assumed prior knowledge (Grade level: College+)', 4)
ON CONFLICT (name) DO NOTHING;

-- Use of jargon defaults
INSERT INTO public.use_of_jargon_option_items (name, display_name, description, sort_order) VALUES
  ('avoid', 'Avoid', 'Simplify technical terms for a general audience', 1),
  ('limited', 'Limited', 'Sprinkle technical terms throughout the content, but prioritize clarity', 2),
  ('standard', 'Standard', 'Use industry-standard jargon allowing technical terms familiar to experts in the field', 3),
  ('define', 'Define', 'Jargon can be used but must first be defined to explain technical terms for readers unfamiliar with them', 4),
  ('analogize', 'Analogize', 'When jargon is used utilize analogies or metaphors to explain complex concepts in relatable terms', 5)
ON CONFLICT (name) DO NOTHING;

-- Storytelling style defaults
INSERT INTO public.storytelling_option_items (name, display_name, description, sort_order) VALUES
  ('narrative', 'Narrative', 'Tells a story with a clear beginning, middle, and end, often featuring a protagonist and a challenge to overcome', 1),
  ('conversational', 'Conversational', 'Uses a friendly, approachable tone to share stories and anecdotes, making the reader feel like they''re part of a conversation', 2),
  ('educational', 'Educational', 'Uses storytelling to teach the reader something new, often incorporating facts, statistics, and expert insights', 3),
  ('humorous', 'Humorous', 'Incorporates wit, satire, or irony to entertain and engage the reader', 4)
ON CONFLICT (name) DO NOTHING;

-- Humor usage defaults
INSERT INTO public.humor_usage_option_items (name, display_name, description, sort_order) VALUES
  ('subtle', 'Subtle', 'Humor that is understated and easy to miss', 1),
  ('lighthearted', 'Lighthearted', 'Humor that is playful and carefree', 2),
  ('moderate', 'Moderate', 'Humor that is noticeable but not overwhelming', 3),
  ('irreverent', 'Irreverent', 'Humor that is bold, sarcastic, and potentially provocative', 4)
ON CONFLICT (name) DO NOTHING;

-- Pacing defaults
INSERT INTO public.pacing_option_items (name, display_name, description, sort_order) VALUES
  ('rapid_fire', 'Rapid-fire', 'Quick, snappy sentences that create a sense of urgency or excitement', 1),
  ('steady', 'Steady', 'A consistent, moderate pace that provides a clear and stable narrative flow', 2),
  ('meandering', 'Meandering', 'A gentle, wandering pace that allows the reader to absorb details and reflect on the content', 3),
  ('conversational', 'Conversational', 'A pace that mimics everyday conversation, with a natural flow and rhythm', 4)
ON CONFLICT (name) DO NOTHING;

-- Sentence length defaults
INSERT INTO public.sentence_option_items_singleton (name, display_name, description, sort_order) VALUES
  ('short', 'Short', 'Prefer short, concise sentences', 1),
  ('mostly_short', 'Mostly Short', 'Primarily short sentences with occasional medium-length sentences', 2),
  ('medium', 'Medium', 'Medium-length sentences', 3),
  ('mostly_medium', 'Mostly Medium', 'Primarily medium-length sentences with some variation', 4),
  ('long', 'Long', 'Longer, complex sentences acceptable', 5),
  ('no_restriction', 'No Restriction', 'No specific preference for sentence length', 6)
ON CONFLICT (name) DO NOTHING;

-- Formality defaults
INSERT INTO public.formality_option_items (name, display_name, description, sort_order) VALUES
  ('formal', 'Formal', 'An objective tone that uses professional vocabulary, complex sentence structures, avoids contractions and uses formal titles and titles with last names to address people', 1),
  ('semi_formal', 'Semi-Formal', 'A polite tone that uses standard vocabulary and a balanced sentence structures. Semi-formal tone may use contractions on a limited basis and use first names in subsequent communications', 2),
  ('conversational', 'Conversational', 'A conversational tone that uses a colloquial vocabulary, simple sentence structures, free use of contractions and first names. Allows the use of humor in a way that aligns with your humor setting', 3),
  ('friendly', 'Friendly', 'A warm tone that uses an approachable vocabulary with varied sentence structures. It may use contractions, colloquialisms, first names and anecdotes. Allows the use of humor in a way that aligns with your humor setting', 4)
ON CONFLICT (name) DO NOTHING;

-- Compliance rule type defaults
INSERT INTO public.compliance_rule_type_option_items (name, display_name, description, sort_order) VALUES
  ('legal', 'Legal', 'Legal compliance requirements', 1),
  ('marketing', 'Marketing', 'Marketing compliance rules', 2),
  ('privacy', 'Privacy', 'Privacy and data protection', 3),
  ('accessibility', 'Accessibility', 'Accessibility requirements', 4),
  ('brand', 'Brand', 'Brand guidelines and standards', 5)
ON CONFLICT (name) DO NOTHING;

-- Typography style options defaults
INSERT INTO public.typography_style_options (programmatic_name, display_name, description, sort_order) VALUES
  ('heading_1', 'Heading 1', 'Primary page heading (H1)', 1),
  ('heading_2', 'Heading 2', 'Section headings (H2)', 2),
  ('heading_3', 'Heading 3', 'Subsection headings (H3)', 3),
  ('heading_4', 'Heading 4', 'Minor headings (H4)', 4),
  ('heading_5', 'Heading 5', 'Smallest headings (H5)', 5),
  ('heading_6', 'Heading 6', 'Micro headings (H6)', 6),
  ('body_text', 'Body Text', 'Standard paragraph text', 7),
  ('body_text_large', 'Body Text Large', 'Large body text (e.g., lead paragraphs)', 8),
  ('body_text_small', 'Body Text Small', 'Small body text', 9),
  ('caption', 'Caption', 'Image captions and footnotes', 10),
  ('label', 'Label', 'Form labels and UI text', 11),
  ('button', 'Button', 'Button text styling', 12),
  ('link', 'Link', 'Hyperlink text styling', 13),
  ('quote', 'Quote', 'Pull quotes and blockquotes', 14),
  ('code', 'Code', 'Inline code and code blocks', 15)
ON CONFLICT (programmatic_name) DO NOTHING;

-- Logo type options defaults
INSERT INTO public.logo_type_options (programmatic_name, display_name, description) VALUES
  ('primary_logo', 'Primary Logo', 'Full primary logo with all elements'),
  ('secondary_logo', 'Secondary Logo', 'Alternative logo version'),
  ('icon_only', 'Icon Only', 'Logo icon or symbol without text'),
  ('wordmark', 'Wordmark', 'Text-only logo without symbol'),
  ('stacked', 'Stacked', 'Vertically stacked logo configuration'),
  ('horizontal', 'Horizontal', 'Horizontal logo configuration'),
  ('monochrome_dark', 'Monochrome Dark', 'Single-color dark version'),
  ('monochrome_light', 'Monochrome Light', 'Single-color light version'),
  ('favicon', 'Favicon', 'Small icon for browser tabs'),
  ('social_media', 'Social Media', 'Optimized for social media profiles')
ON CONFLICT (programmatic_name) DO NOTHING;

-- Font options defaults (common web-safe and Google Fonts)
INSERT INTO public.font_options (programmatic_name, display_name, source, license_notes) VALUES
  ('inter', 'Inter', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('roboto', 'Roboto', 'Google Fonts', 'Apache License 2.0 - free for commercial use'),
  ('open_sans', 'Open Sans', 'Google Fonts', 'Apache License 2.0 - free for commercial use'),
  ('lato', 'Lato', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('montserrat', 'Montserrat', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('poppins', 'Poppins', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('raleway', 'Raleway', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('source_sans_pro', 'Source Sans Pro', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('pt_serif', 'PT Serif', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('merriweather', 'Merriweather', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('nunito', 'Nunito', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('playfair_display', 'Playfair Display', 'Google Fonts', 'Open Font License - free for commercial use'),
  ('arial', 'Arial', 'System', 'System font - universally available'),
  ('helvetica', 'Helvetica', 'System', 'System font - widely available'),
  ('georgia', 'Georgia', 'System', 'System font - universally available'),
  ('times_new_roman', 'Times New Roman', 'System', 'System font - universally available')
ON CONFLICT (programmatic_name) DO NOTHING;

-- Social template types defaults
INSERT INTO public.social_template_types (programmatic_name, display_name, network, banner_dimensions, banner_design_json) VALUES
  (
    'linkedin_banner', 
    'LinkedIn Banner', 
    'linkedin', 
    '{"width": 1584, "height": 396}'::jsonb,
    '{"template": "default", "version": "1.0"}'::jsonb
  ),
  (
    'linkedin_post', 
    'LinkedIn Post Image', 
    'linkedin', 
    '{"width": 1200, "height": 627}'::jsonb,
    '{"template": "default", "version": "1.0"}'::jsonb
  ),
  (
    'x_header', 
    'X (Twitter) Header', 
    'x', 
    '{"width": 1500, "height": 500}'::jsonb,
    '{"template": "default", "version": "1.0"}'::jsonb
  ),
  (
    'x_post', 
    'X (Twitter) Post Image', 
    'x', 
    '{"width": 1200, "height": 675}'::jsonb,
    '{"template": "default", "version": "1.0"}'::jsonb
  ),
  (
    'facebook_cover', 
    'Facebook Cover Photo', 
    'facebook', 
    '{"width": 820, "height": 312}'::jsonb,
    '{"template": "default", "version": "1.0"}'::jsonb
  ),
  (
    'facebook_post', 
    'Facebook Post Image', 
    'facebook', 
    '{"width": 1200, "height": 630}'::jsonb,
    '{"template": "default", "version": "1.0"}'::jsonb
  ),
  (
    'instagram_post', 
    'Instagram Post (Square)', 
    'instagram', 
    '{"width": 1080, "height": 1080}'::jsonb,
    '{"template": "default", "version": "1.0"}'::jsonb
  ),
  (
    'instagram_story', 
    'Instagram Story', 
    'instagram', 
    '{"width": 1080, "height": 1920}'::jsonb,
    '{"template": "default", "version": "1.0"}'::jsonb
  )
ON CONFLICT (programmatic_name) DO NOTHING;

