import { z } from 'zod';

// =============================================================================
// ZOD SCHEMAS (defined first so they can be used for type inference)
// =============================================================================

export const visualStyleGuideSchema = z.object({
  visual_style_guide_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  default_logo_asset_id: z.string().uuid().nullable().optional(),
  imagery_guidelines: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const logoAssetSchema = z.object({
  logo_asset_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  visual_style_guide_id: z.string().uuid(),
  logo_type_option_id: z.string().uuid(),
  is_default: z.boolean(),
  is_vector: z.boolean(),
  is_circular_crop: z.boolean(),
  circular_safe_area: z.unknown().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  svg_text: z.string().nullable().optional(),
  file_blob: z.string().nullable().optional(),
  storage_path: z.string().nullable().optional(),
  file_url: z.string().nullable().optional(),
  created_by_user_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
});

export const paletteColorSchema = z.object({
  palette_color_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  hex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  name: z.string().nullable().optional(),
  usage_option: z.enum(['primary', 'neutral', 'danger', 'success', 'warning']),
  sort_order: z.number().int(),
  contrast_ratio_against_background: z.number().nullable().optional(),
  created_at: z.string(),
  style_guide_id: z.string().uuid().nullable().optional(),
});

export const typographyStyleSchema = z.object({
  typography_style_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  visual_style_guide_id: z.string().uuid(),
  typography_style_option_id: z.string().uuid(),
  font_option_id: z.string().uuid().nullable().optional(),
  font_family: z.string().min(1),
  font_fallbacks: z.string().nullable().optional(),
  font_size_px: z.number().int().positive(),
  line_height: z.number().nullable().optional(),
  font_weight: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .nullable()
    .optional(),
  css_snippet: z.string().nullable().optional(),
  licensing_notes: z.string().nullable().optional(),
  created_by_user_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
});

export const typographyStyleOptionSchema = z.object({
  typography_style_option_id: z.string().uuid(),
  programmatic_name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const logoTypeOptionSchema = z.object({
  logo_type_option_id: z.string().uuid(),
  programmatic_name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export const fontOptionSchema = z.object({
  font_option_id: z.string().uuid(),
  programmatic_name: z.string().min(1),
  display_name: z.string().min(1),
  source: z.string().nullable().optional(),
  license_notes: z.string().nullable().optional(),
  created_at: z.string(),
});

export const socialTemplateTypeSchema = z.object({
  social_template_type_id: z.string().uuid(),
  programmatic_name: z.string().min(1),
  display_name: z.string().min(1),
  network: z.enum(['linkedin', 'x', 'facebook', 'instagram']),
  banner_dimensions: z.unknown().nullable().optional(),
  banner_design_json: z.unknown().nullable().optional(),
  created_at: z.string(),
});

export const socialTemplateSchema = z.object({
  social_template_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  visual_style_guide_id: z.string().uuid(),
  social_template_type_id: z.string().uuid(),
  default_copy: z.string().nullable().optional(),
  default_hashtags: z.unknown().nullable().optional(),
  design_tokens: z.unknown().nullable().optional(),
  is_locked: z.boolean(),
  published_at: z.string().nullable().optional(),
  created_by_user_id: z.string().uuid().nullable().optional(),
  created_at: z.string(),
});

export const schemas = {
  visualStyleGuide: visualStyleGuideSchema,
  logoAsset: logoAssetSchema,
  paletteColor: paletteColorSchema,
  typographyStyle: typographyStyleSchema,
  typographyStyleOption: typographyStyleOptionSchema,
  logoTypeOption: logoTypeOptionSchema,
  fontOption: fontOptionSchema,
  socialTemplateType: socialTemplateTypeSchema,
  socialTemplate: socialTemplateSchema,
};

// =============================================================================
// TYPE DEFINITIONS (inferred from Zod schemas)
// =============================================================================
// Note: These types are inferred from Zod schemas. Once Supabase types are generated,
// these can be replaced with Tables<T>, TablesInsert<T>, TablesUpdate<T> from
// @/supabase/types/supabase

/**
 * Visual Style Guides: Primary record for a customer's visual identity.
 */
export type VisualStyleGuide = z.infer<typeof visualStyleGuideSchema>;
export type NewVisualStyleGuide = Omit<
  VisualStyleGuide,
  'visual_style_guide_id' | 'created_at' | 'updated_at'
>;
export type UpdateVisualStyleGuide = Partial<NewVisualStyleGuide>;

/**
 * Logo Assets: Uploaded/extracted logos associated to a visual style guide.
 */
export type LogoAsset = z.infer<typeof logoAssetSchema>;
export type NewLogoAsset = Omit<LogoAsset, 'logo_asset_id' | 'created_at'>;
export type UpdateLogoAsset = Partial<NewLogoAsset>;

/**
 * Palette Colors: Individual brand colors with intended usage and contrast.
 */
export type PaletteColor = z.infer<typeof paletteColorSchema>;
export type NewPaletteColor = Omit<PaletteColor, 'palette_color_id' | 'created_at'>;
export type UpdatePaletteColor = Partial<NewPaletteColor>;

/**
 * Typography Styles: Typographic rules per canonical role (h1..body, etc.).
 */
export type TypographyStyle = z.infer<typeof typographyStyleSchema>;
export type NewTypographyStyle = Omit<TypographyStyle, 'typography_style_id' | 'created_at'>;
export type UpdateTypographyStyle = Partial<NewTypographyStyle>;

/**
 * System Option Tables (Singleton scope):
 * - typography_style_options
 * - logo_type_options
 * - font_options
 * - social_template_types
 */
export type TypographyStyleOption = z.infer<typeof typographyStyleOptionSchema>;
export type LogoTypeOption = z.infer<typeof logoTypeOptionSchema>;
export type FontOption = z.infer<typeof fontOptionSchema>;
export type SocialTemplateType = z.infer<typeof socialTemplateTypeSchema>;

/**
 * Social Templates: Derived social banners per network from a guide.
 */
export type SocialTemplate = z.infer<typeof socialTemplateSchema>;
export type NewSocialTemplate = Omit<SocialTemplate, 'social_template_id' | 'created_at'>;
export type UpdateSocialTemplate = Partial<NewSocialTemplate>;
