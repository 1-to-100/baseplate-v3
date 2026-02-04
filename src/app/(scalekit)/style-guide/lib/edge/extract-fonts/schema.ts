/**
 * Zod schema for typography extraction response
 *
 * Single source of truth for:
 * 1. OpenAI JSON Schema response format
 * 2. TypeScript types
 * 3. Runtime validation in tests
 */
import { z } from 'npm:zod@3.24.1';
import { zodToJsonSchema } from 'npm:zod-to-json-schema@3.24.1';

// ============================================================================
// Zod Schema Definitions
// ============================================================================

export const TypographyStyleItemSchema = z
  .object({
    typography_style_option_id: z.string().describe('UUID from typography style options'),
    font_option_id: z.string().nullable().describe('UUID from font options if matched'),
    font_family: z.string().describe('Font family name (e.g., "Inter", "Roboto")'),
    font_size_px: z.number().int().describe('Font size in pixels'),
    line_height: z.number().nullable().describe('Line height multiplier (e.g., 1.5)'),
    font_weight: z.string().nullable().describe('Font weight (e.g., "400", "bold")'),
    color: z.string().nullable().describe('Text color as hex code with # prefix'),
  })
  .strict();

export const TypographyResponseSchema = z
  .object({
    typography_styles: z.array(TypographyStyleItemSchema),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type TypographyStyleItem = z.infer<typeof TypographyStyleItemSchema>;
export type TypographyResponse = z.infer<typeof TypographyResponseSchema>;

// ============================================================================
// JSON Schema for OpenAI API
// ============================================================================

function createOpenAIJsonSchema<T extends z.ZodTypeAny>(
  schema: T,
  name: string
): {
  type: 'json_schema';
  name: string;
  strict: true;
  schema: Record<string, unknown>;
} {
  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  delete jsonSchema.$schema;

  return {
    type: 'json_schema',
    name,
    strict: true,
    schema: jsonSchema,
  };
}

export const typographyJsonSchema = createOpenAIJsonSchema(
  TypographyResponseSchema,
  'typography_extraction_response'
);

// ============================================================================
// Validation Helpers
// ============================================================================

export function parseTypographyResponse(data: unknown): TypographyResponse {
  return TypographyResponseSchema.parse(data);
}

export function safeParseTypographyResponse(
  data: unknown
): z.SafeParseReturnType<unknown, TypographyResponse> {
  return TypographyResponseSchema.safeParse(data);
}
