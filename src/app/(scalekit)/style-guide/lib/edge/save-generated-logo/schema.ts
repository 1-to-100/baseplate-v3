/**
 * Zod schema for save-generated-logo edge function
 *
 * Single source of truth for:
 * 1. TypeScript types
 * 2. Runtime validation
 * 3. Request/response formats
 */
import { z } from 'npm:zod@3.24.1';

// ============================================================================
// Request Schema
// ============================================================================

/**
 * Schema for save-generated-logo request
 * Purpose: Downloads AI-generated logos and saves them to Supabase Storage
 */
export const SaveGeneratedLogoRequestSchema = z
  .object({
    visual_style_guide_id: z.string().uuid().describe('UUID of the visual style guide'),
    logo_url: z.string().url().describe('URL of the AI-generated logo to download and save'),
    logo_type_option_id: z
      .string()
      .uuid()
      .optional()
      .describe('Optional single logo type ID (deprecated, use logo_type_option_ids)'),
    logo_type_option_ids: z
      .array(z.string().uuid())
      .optional()
      .describe('Array of logo type IDs to save to (if not provided, saves to all active types)'),
    all_logo_urls: z
      .array(z.string().url())
      .optional()
      .describe('All generated logos to store as presets'),
  })
  .strict();

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Schema for a preset logo stored in the response
 */
export const PresetLogoSchema = z
  .object({
    id: z.string().describe('Unique identifier for the preset logo'),
    url: z.string().url().describe('Signed URL for the preset logo'),
    storage_path: z.string().describe('Storage path in Supabase Storage'),
  })
  .strict();

/**
 * Schema for save-generated-logo response
 */
export const SaveGeneratedLogoResponseSchema = z
  .object({
    storage_path: z.string().describe('Storage path where the logo was saved'),
    signed_url: z.string().url().describe('Signed URL for accessing the saved logo'),
    logo_asset_id: z.string().uuid().describe('UUID of the created/updated logo asset'),
    preset_logos: z
      .array(PresetLogoSchema)
      .optional()
      .describe('All stored preset logos with signed URLs'),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type SaveGeneratedLogoRequest = z.infer<typeof SaveGeneratedLogoRequestSchema>;
export type PresetLogo = z.infer<typeof PresetLogoSchema>;
export type SaveGeneratedLogoResponse = z.infer<typeof SaveGeneratedLogoResponseSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Parse and validate a save-generated-logo request
 * Returns typed result or throws ZodError
 */
export function parseSaveGeneratedLogoRequest(data: unknown): SaveGeneratedLogoRequest {
  return SaveGeneratedLogoRequestSchema.parse(data);
}

/**
 * Safe parse request - returns success/error result without throwing
 */
export function safeParseSaveGeneratedLogoRequest(
  data: unknown
): z.SafeParseReturnType<unknown, SaveGeneratedLogoRequest> {
  return SaveGeneratedLogoRequestSchema.safeParse(data);
}

/**
 * Parse and validate a save-generated-logo response
 * Returns typed result or throws ZodError
 */
export function parseSaveGeneratedLogoResponse(data: unknown): SaveGeneratedLogoResponse {
  return SaveGeneratedLogoResponseSchema.parse(data);
}

/**
 * Safe parse response - returns success/error result without throwing
 */
export function safeParseSaveGeneratedLogoResponse(
  data: unknown
): z.SafeParseReturnType<unknown, SaveGeneratedLogoResponse> {
  return SaveGeneratedLogoResponseSchema.safeParse(data);
}
