/**
 * Zod schema for segments response
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

export const SegmentItemSchema = z
  .object({
    name: z.string().describe('Name of the market segment'),
    description: z.string().describe('Description of the segment (one paragraph, 4-6 sentences)'),
  })
  .strict();

export const SegmentsResponseSchema = z
  .object({
    segments: z.array(SegmentItemSchema),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type SegmentItem = z.infer<typeof SegmentItemSchema>;
export type SegmentsResponse = z.infer<typeof SegmentsResponseSchema>;

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

export const segmentsJsonSchema = createOpenAIJsonSchema(
  SegmentsResponseSchema,
  'segments_response'
);

// ============================================================================
// Validation Helpers
// ============================================================================

export function parseSegmentsResponse(data: unknown): SegmentsResponse {
  return SegmentsResponseSchema.parse(data);
}

export function safeParseSegmentsResponse(
  data: unknown
): z.SafeParseReturnType<unknown, SegmentsResponse> {
  return SegmentsResponseSchema.safeParse(data);
}
