/**
 * Zod schema for customer strategy response
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

/**
 * Schema for individual strategy items (values and principles)
 */
export const StrategyItemSchema = z
  .object({
    name: z.string().describe('Concise name (max 8 words)'),
    description: z.string().describe('2-3 sentence description highlighting why it matters'),
  })
  .strict();

/**
 * Schema for the main strategy response from OpenAI
 */
export const StrategyResponseSchema = z
  .object({
    company_name: z.string().nullable().describe('Company name'),
    tagline: z.string().nullable().describe('Company tagline'),
    one_sentence_summary: z.string().nullable().describe('One sentence summary of the company'),
    problem_overview: z.string().nullable().describe('Overview of the problem the company solves'),
    solution_overview: z.string().nullable().describe('Overview of the company solution'),
    content_authoring_prompt: z.string().nullable().describe('Prompt for content authoring'),
    mission: z.string().describe('Company mission statement'),
    mission_description: z.string().describe('Detailed mission description'),
    vision: z.string().describe('Company vision statement'),
    vision_description: z.string().describe('Detailed vision description'),
    values: z.array(StrategyItemSchema).describe('Company values (3-6 items)'),
    principles: z.array(StrategyItemSchema).describe('Company principles (3-6 items)'),
  })
  .strict();

/**
 * Schema for supplemental strategy items array (fallback generation)
 */
export const SupplementalStrategyItemsSchema = z.array(StrategyItemSchema);

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type StrategyItem = z.infer<typeof StrategyItemSchema>;
export type StrategyResponse = z.infer<typeof StrategyResponseSchema>;
export type SupplementalStrategyItems = z.infer<typeof SupplementalStrategyItemsSchema>;

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
 * Ready-to-use JSON Schema config for main strategy response
 */
export const strategyResponseJsonSchema = createOpenAIJsonSchema(
  StrategyResponseSchema,
  'strategy_response'
);

/**
 * Ready-to-use JSON Schema config for supplemental strategy items
 */
export const supplementalStrategyItemsJsonSchema = createOpenAIJsonSchema(
  SupplementalStrategyItemsSchema,
  'strategy_items_response'
);

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Parse and validate a strategy response against the schema
 * Returns typed result or throws ZodError
 */
export function parseStrategyResponse(data: unknown): StrategyResponse {
  return StrategyResponseSchema.parse(data);
}

/**
 * Safe parse - returns success/error result without throwing
 */
export function safeParseStrategyResponse(
  data: unknown
): z.SafeParseReturnType<unknown, StrategyResponse> {
  return StrategyResponseSchema.safeParse(data);
}

/**
 * Parse supplemental strategy items array
 */
export function parseSupplementalStrategyItems(data: unknown): SupplementalStrategyItems {
  return SupplementalStrategyItemsSchema.parse(data);
}

/**
 * Safe parse for supplemental strategy items
 */
export function safeParseSupplementalStrategyItems(
  data: unknown
): z.SafeParseReturnType<unknown, SupplementalStrategyItems> {
  return SupplementalStrategyItemsSchema.safeParse(data);
}
