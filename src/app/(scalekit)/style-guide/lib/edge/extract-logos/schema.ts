/**
 * Zod schema for logo extraction response
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

export const LogoAssetItemSchema = z
  .object({
    logo_type_option_id: z.string().describe('UUID from logo type options'),
    description: z
      .string()
      .nullable()
      .describe('Description of the logo variation and where it is used'),
    file_url: z.string().nullable().describe('Direct URL to the logo file if found'),
  })
  .strict();

export const LogosResponseSchema = z
  .object({
    logo_assets: z.array(LogoAssetItemSchema),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type LogoAssetItem = z.infer<typeof LogoAssetItemSchema>;
export type LogosResponse = z.infer<typeof LogosResponseSchema>;

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

export const logosJsonSchema = createOpenAIJsonSchema(
  LogosResponseSchema,
  'logo_extraction_response'
);

// ============================================================================
// Validation Helpers
// ============================================================================

export function parseLogosResponse(data: unknown): LogosResponse {
  return LogosResponseSchema.parse(data);
}

export function safeParseLogosResponse(
  data: unknown
): z.SafeParseReturnType<unknown, LogosResponse> {
  return LogosResponseSchema.safeParse(data);
}
