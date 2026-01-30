/**
 * Zod schema for persona recommendation response
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

export const DigitalSavvinessEnum = z.enum([
  'Digital Novice',
  'Basic User',
  'Digital Citizen',
  'Intermediate User',
  'Tech-Savvy',
  'Power User',
  'Digital Specialist',
  'Tech Expert',
  'Innovator',
  'Digital Thought Leader',
]);

export const PersonaRecommendationSchema = z
  .object({
    titles: z.array(z.string()).describe('Array of job titles and variations'),
    experience_level: z
      .number()
      .describe(
        'Years of experience (0-2: Entry, 2-5: Early career, 5-10: Mid-level, 10-15: Senior, 15-20: Executive, 20+: Veteran)'
      ),
    job_responsibilities: z
      .string()
      .describe(
        'Markdown formatted unordered list of responsibilities of the role in the context of the solution'
      ),
    is_manager: z.boolean().describe('Whether this role typically manages others'),
    department: z.string().describe('Department name'),
    pain_points_html: z
      .string()
      .describe('Markdown formatted unordered list of general job challenges'),
    goals_html: z.string().describe('Markdown formatted unordered list of general job goals'),
    solution_relevant_pain_points_html: z
      .string()
      .describe('Markdown formatted unordered list of challenges the solution addresses'),
    solution_relevant_goals_html: z
      .string()
      .describe('Markdown formatted unordered list of goals the solution helps achieve'),
    current_solutions_html: z
      .string()
      .describe('Markdown formatted unordered list of current tools and processes'),
    switching_costs_html: z
      .string()
      .describe('Markdown formatted unordered list of costs of switching to the solution'),
    unsatisfied_with_html: z
      .string()
      .describe('Markdown formatted unordered list of current solution problems'),
    ideal_outcome_html: z
      .string()
      .describe('Markdown formatted unordered list of desired outcomes'),
    buying_behavior: z
      .string()
      .describe('Markdown formatted unordered list of summary of purchasing habits'),
    digital_savviness: DigitalSavvinessEnum.describe('Level of digital expertise'),
    is_decider: z.boolean().describe('Whether this role typically makes purchasing decisions'),
  })
  .strict();

// ============================================================================
// TypeScript Types (inferred from Zod)
// ============================================================================

export type DigitalSavviness = z.infer<typeof DigitalSavvinessEnum>;
export type PersonaRecommendation = z.infer<typeof PersonaRecommendationSchema>;

// ============================================================================
// JSON Schema for OpenAI API
// ============================================================================

function createOpenAIJsonSchema<T extends z.ZodTypeAny>(
  schema: T,
  name: string
): {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  };
} {
  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  delete jsonSchema.$schema;

  return {
    type: 'json_schema',
    json_schema: {
      name,
      strict: true,
      schema: jsonSchema,
    },
  };
}

export const personaRecommendationJsonSchema = createOpenAIJsonSchema(
  PersonaRecommendationSchema,
  'persona_recommendation'
);

// ============================================================================
// Validation Helpers
// ============================================================================

export function parsePersonaRecommendation(data: unknown): PersonaRecommendation {
  return PersonaRecommendationSchema.parse(data);
}

export function safeParsePersonaRecommendation(
  data: unknown
): z.SafeParseReturnType<unknown, PersonaRecommendation> {
  return PersonaRecommendationSchema.safeParse(data);
}
