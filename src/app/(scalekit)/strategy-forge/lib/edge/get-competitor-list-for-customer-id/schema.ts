/**
 * Zod schema for competitor list response
 *
 * Single source of truth for:
 * 1. OpenAI JSON Schema response format
 * 2. TypeScript types
 * 3. Runtime validation in tests
 */
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// Zod Schema Definition
// ============================================================================

export const CompetitorItemSchema = z
  .object({
    name: z.string().describe('Company name'),
    website_url: z.string().describe('Official website URL (https://)'),
    description: z.string().describe('2-3 sentences explaining positioning and differentiation'),
  })
  .strict();

export const CompetitorsResponseSchema = z
  .object({
    competitors: z.array(CompetitorItemSchema),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type CompetitorItem = z.infer<typeof CompetitorItemSchema>;
export type CompetitorsResponse = z.infer<typeof CompetitorsResponseSchema>;

// ============================================================================
// JSON Schema for OpenAI API
// ============================================================================

/**
 * Converts Zod schema to JSON Schema format for OpenAI's response_format
 */
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
    // Remove $schema and definitions for cleaner output
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  // Remove metadata fields OpenAI doesn't need
  delete jsonSchema.$schema;

  return {
    type: 'json_schema',
    name,
    strict: true,
    schema: jsonSchema,
  };
}

/**
 * Ready-to-use JSON Schema config for OpenAI Responses API
 *
 * Usage in Edge Function:
 * ```ts
 * const payload = {
 *   model: 'gpt-5',
 *   input: prompt,
 *   text: { format: competitorsJsonSchema }
 * };
 * ```
 */
export const competitorsJsonSchema = createOpenAIJsonSchema(
  CompetitorsResponseSchema,
  'competitors_response'
);

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Parse and validate a response against the schema
 * Returns typed result or throws ZodError
 */
export function parseCompetitorsResponse(data: unknown): CompetitorsResponse {
  return CompetitorsResponseSchema.parse(data);
}

/**
 * Safe parse - returns success/error result without throwing
 */
export function safeParseCompetitorsResponse(
  data: unknown
): z.SafeParseReturnType<unknown, CompetitorsResponse> {
  return CompetitorsResponseSchema.safeParse(data);
}
