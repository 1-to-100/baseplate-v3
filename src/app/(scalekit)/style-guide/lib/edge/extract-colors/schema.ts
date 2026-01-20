/**
 * Zod schema for color extraction response
 *
 * Single source of truth for:
 * 1. OpenAI JSON Schema response format
 * 2. TypeScript types
 * 3. Runtime validation in tests
 */
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// Zod Schema Definitions
// ============================================================================

export const UsageOptionEnum = z.enum([
  'primary',
  'secondary',
  'foreground',
  'background',
  'accent',
]);

export const PaletteColorItemSchema = z
  .object({
    hex: z.string().describe('Hex color code with # prefix (e.g., "#1976D2")'),
    name: z.string().describe('Descriptive color name (e.g., "Primary Blue")'),
    usage_option: UsageOptionEnum.describe('How the color is used in the design'),
    sort_order: z.number().int().describe('Order for display (starting from 1)'),
  })
  .strict();

export const ColorsResponseSchema = z
  .object({
    palette_colors: z.array(PaletteColorItemSchema),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type UsageOption = z.infer<typeof UsageOptionEnum>;
export type PaletteColorItem = z.infer<typeof PaletteColorItemSchema>;
export type ColorsResponse = z.infer<typeof ColorsResponseSchema>;

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

export const colorsJsonSchema = createOpenAIJsonSchema(
  ColorsResponseSchema,
  'color_extraction_response'
);

// ============================================================================
// Validation Helpers
// ============================================================================

export function parseColorsResponse(data: unknown): ColorsResponse {
  return ColorsResponseSchema.parse(data);
}

export function safeParseColorsResponse(
  data: unknown
): z.SafeParseReturnType<unknown, ColorsResponse> {
  return ColorsResponseSchema.safeParse(data);
}
