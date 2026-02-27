/**
 * Zod schema for create-company-information response
 *
 * Single source of truth for:
 * 1. OpenAI JSON Schema response format
 * 2. TypeScript types
 * 3. Runtime validation in tests
 */
import { z } from 'npm:zod@3.24.1';
import { zodToJsonSchema } from 'npm:zod-to-json-schema@3.24.1';

// ============================================================================
// Zod Schema Definition
// ============================================================================

export const GeneratedCompanyInfoSchema = z
  .object({
    tagline: z.string().describe('A punchy, memorable tagline (3-7 words).'),
    one_sentence_summary: z
      .string()
      .describe('One sentence summary of what the company does and who it serves.'),
    problem_overview: z
      .string()
      .describe('Customer-facing explanation of the core problem or pain point being solved.'),
    solution_overview: z
      .string()
      .describe(
        'How the product/service solves the problem, including key benefits and differentiators.'
      ),
    competitive_overview: z
      .string()
      .describe(
        'Competitive landscape and company positioning with clear differentiators versus alternatives.'
      ),
    content_authoring_prompt: z
      .string()
      .nullable()
      .describe(
        'Authoring guidance for future content generation. Use null when insufficient information is available.'
      ),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type GeneratedCompanyInfo = z.infer<typeof GeneratedCompanyInfoSchema>;

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

export const companyInfoJsonSchema = createOpenAIJsonSchema(
  GeneratedCompanyInfoSchema,
  'company_information_response'
);

// ============================================================================
// Validation Helpers
// ============================================================================

export function parseGeneratedCompanyInfo(data: unknown): GeneratedCompanyInfo {
  return GeneratedCompanyInfoSchema.parse(data);
}

export function safeParseGeneratedCompanyInfo(
  data: unknown
): z.SafeParseReturnType<unknown, GeneratedCompanyInfo> {
  return GeneratedCompanyInfoSchema.safeParse(data);
}
