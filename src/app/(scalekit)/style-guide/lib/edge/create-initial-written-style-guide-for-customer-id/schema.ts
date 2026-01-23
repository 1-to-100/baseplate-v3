/**
 * Zod schema for written style guide response
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

export const VocabularyTypeEnum = z.enum(['preferred', 'prohibited']);

export const FramingConceptSchema = z
  .object({
    name: z.string().describe('Short name for the framing concept'),
    description: z
      .string()
      .describe('One paragraph (3-5 sentences) explaining how to apply this framing'),
  })
  .strict();

export const VocabularyEntrySchema = z
  .object({
    name: z.string().describe('The word or phrase'),
    vocabulary_type: VocabularyTypeEnum.describe('Whether this term should be used or avoided'),
    suggested_replacement: z
      .string()
      .nullable()
      .describe('For prohibited words, what to use instead'),
    example_usage: z.string().nullable().describe('For preferred words, an example of usage'),
  })
  .strict();

export const StyleGuideResponseSchema = z
  .object({
    brand_personality: z
      .string()
      .nullable()
      .describe('1-2 sentences describing the company overall personality and tone'),
    brand_voice: z
      .string()
      .nullable()
      .describe('Comma-separated list of 3-5 adjectives describing the brand voice'),
    formality_option_item_id: z.string().nullable().describe('UUID from formality options'),
    sentence_length_option_item_id: z
      .string()
      .nullable()
      .describe('UUID from sentence length options'),
    pacing_option_item_id: z.string().nullable().describe('UUID from pacing options'),
    humor_usage_option_item_id: z.string().nullable().describe('UUID from humor usage options'),
    storytelling_style_option_item_id: z
      .string()
      .nullable()
      .describe('UUID from storytelling style options'),
    use_of_jargon_option_item_id: z.string().nullable().describe('UUID from jargon usage options'),
    language_level_option_item_id: z
      .string()
      .nullable()
      .describe('UUID from language level options'),
    inclusivity_guidelines: z
      .string()
      .nullable()
      .describe('2-4 sentences of inclusive language guidelines'),
    framing_concepts: z
      .array(FramingConceptSchema)
      .describe('3-7 framing concepts (metaphors, analogies) found in the content'),
    vocabulary_entries: z
      .array(VocabularyEntrySchema)
      .describe('15-35 vocabulary entries (both preferred and prohibited terms)'),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type VocabularyType = z.infer<typeof VocabularyTypeEnum>;
export type FramingConcept = z.infer<typeof FramingConceptSchema>;
export type VocabularyEntry = z.infer<typeof VocabularyEntrySchema>;
export type StyleGuideResponse = z.infer<typeof StyleGuideResponseSchema>;

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

export const styleGuideJsonSchema = createOpenAIJsonSchema(
  StyleGuideResponseSchema,
  'style_guide_response'
);

// ============================================================================
// Validation Helpers
// ============================================================================

export function parseStyleGuideResponse(data: unknown): StyleGuideResponse {
  return StyleGuideResponseSchema.parse(data);
}

export function safeParseStyleGuideResponse(
  data: unknown
): z.SafeParseReturnType<unknown, StyleGuideResponse> {
  return StyleGuideResponseSchema.safeParse(data);
}
