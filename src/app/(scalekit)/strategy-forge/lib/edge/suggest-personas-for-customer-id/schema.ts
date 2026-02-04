/**
 * Zod schema for personas response
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

export const PersonaItemSchema = z
  .object({
    name: z.string().describe('Name of the persona'),
    description: z.string().describe('Description of the persona (one paragraph, 4-6 sentences)'),
  })
  .strict();

export const PersonasResponseSchema = z
  .object({
    personas: z.array(PersonaItemSchema),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type PersonaItem = z.infer<typeof PersonaItemSchema>;
export type PersonasResponse = z.infer<typeof PersonasResponseSchema>;

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

export const personasJsonSchema = createOpenAIJsonSchema(
  PersonasResponseSchema,
  'personas_response'
);

// ============================================================================
// Validation Helpers
// ============================================================================

export function parsePersonasResponse(data: unknown): PersonasResponse {
  return PersonasResponseSchema.parse(data);
}

export function safeParsePersonasResponse(
  data: unknown
): z.SafeParseReturnType<unknown, PersonasResponse> {
  return PersonasResponseSchema.safeParse(data);
}
