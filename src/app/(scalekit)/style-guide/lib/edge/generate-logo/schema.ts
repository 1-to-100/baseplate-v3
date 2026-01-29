/**
 * Zod schema for logo generation response
 *
 * Single source of truth for:
 * 1. TypeScript types
 * 2. Runtime validation
 * 3. OpenAI Images API response format
 */
import { z } from 'zod';

// ============================================================================
// OpenAI Images API Response Schema
// ============================================================================

/**
 * Schema for individual image data item from OpenAI Images API
 * Matches the response format from /v1/images/generations
 */
export const ImageDataItemSchema = z
  .object({
    url: z.string().optional().describe('Image URL when available'),
    b64_json: z.string().optional().describe('Base64-encoded image data when returned'),
    revised_prompt: z.string().optional().describe("OpenAI's revised/enhanced prompt"),
  })
  .strict();

/**
 * Schema for the complete OpenAI Images API response
 */
export const OpenAIImagesResponseSchema = z.object({
  data: z.array(ImageDataItemSchema).describe('Array of generated images'),
});

// ============================================================================
// Application Logo Schemas
// ============================================================================

/**
 * Schema for a generated logo in our application format
 */
export const GeneratedLogoSchema = z
  .object({
    id: z.string().describe('Unique identifier for the generated logo'),
    url: z.string().describe('URL or data URL of the logo image'),
    revised_prompt: z.string().optional().describe("OpenAI's revised prompt"),
  })
  .strict();

/**
 * Schema for the edge function response containing generated logos
 */
export const GenerateLogoResponseSchema = z
  .object({
    logos: z.array(GeneratedLogoSchema).describe('Array of generated logo variations'),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type ImageDataItem = z.infer<typeof ImageDataItemSchema>;
export type OpenAIImagesResponse = z.infer<typeof OpenAIImagesResponseSchema>;
export type GeneratedLogo = z.infer<typeof GeneratedLogoSchema>;
export type GenerateLogoResponse = z.infer<typeof GenerateLogoResponseSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Parse and validate an OpenAI Images API response
 * Returns typed result or throws ZodError
 */
export function parseOpenAIImagesResponse(data: unknown): OpenAIImagesResponse {
  return OpenAIImagesResponseSchema.parse(data);
}

/**
 * Safe parse - returns success/error result without throwing
 */
export function safeParseOpenAIImagesResponse(
  data: unknown
): z.SafeParseReturnType<unknown, OpenAIImagesResponse> {
  return OpenAIImagesResponseSchema.safeParse(data);
}

/**
 * Parse and validate a generated logo
 * Returns typed result or throws ZodError
 */
export function parseGeneratedLogo(data: unknown): GeneratedLogo {
  return GeneratedLogoSchema.parse(data);
}

/**
 * Parse and validate the complete generate logo response
 * Returns typed result or throws ZodError
 */
export function parseGenerateLogoResponse(data: unknown): GenerateLogoResponse {
  return GenerateLogoResponseSchema.parse(data);
}
