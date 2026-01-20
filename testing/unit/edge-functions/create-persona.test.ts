/**
 * Tests for create-persona Edge Function schema
 *
 * Run: deno task test
 * Run single: deno test --allow-net --allow-env --allow-read create-persona.test.ts
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import {
  safeParsePersonaRecommendation,
  personaRecommendationJsonSchema,
  DigitalSavvinessEnum,
} from '../../../src/app/(scalekit)/strategy-forge/lib/edge/create-persona/schema.ts';

// ============================================================================
// Schema Validation Tests (Unit Tests - No Network)
// ============================================================================

Deno.test('Schema: validates correct persona recommendation', () => {
  const validResponse = {
    titles: ['Software Engineer', 'Developer', 'Programmer'],
    experience_level: 5,
    job_responsibilities: '- Write code\n- Review PRs\n- Design systems',
    is_manager: false,
    department: 'Engineering',
    pain_points_html: '- Too many meetings\n- Technical debt',
    goals_html: '- Ship features\n- Learn new tech',
    solution_relevant_pain_points_html: '- Manual deployments\n- Slow CI',
    solution_relevant_goals_html: '- Faster releases\n- Better monitoring',
    current_solutions_html: '- Jenkins\n- Manual scripts',
    switching_costs_html: '- Training time\n- Migration effort',
    unsatisfied_with_html: '- Slow builds\n- Poor docs',
    ideal_outcome_html: '- One-click deploys\n- Fast feedback',
    buying_behavior: '- Researches online\n- Values peer reviews',
    digital_savviness: 'Tech-Savvy',
    is_decider: false,
  };

  const result = safeParsePersonaRecommendation(validResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.titles.length, 3);
    assertEquals(result.data.department, 'Engineering');
    assertEquals(result.data.digital_savviness, 'Tech-Savvy');
  }
});

Deno.test('Schema: validates all digital savviness levels', () => {
  const validLevels = [
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
  ];

  for (const level of validLevels) {
    const result = DigitalSavvinessEnum.safeParse(level);
    assertEquals(result.success, true, `Should accept "${level}"`);
  }
});

Deno.test('Schema: rejects invalid digital savviness', () => {
  const result = DigitalSavvinessEnum.safeParse('Invalid Level');
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidResponse = {
    titles: ['Engineer'],
    // missing all other required fields
  };

  const result = safeParsePersonaRecommendation(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('experience_level'));
    assert(fieldErrors.includes('department'));
    assert(fieldErrors.includes('digital_savviness'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const responseWithExtra = {
    titles: ['Engineer'],
    experience_level: 5,
    job_responsibilities: '- Code',
    is_manager: false,
    department: 'Engineering',
    pain_points_html: '- Pain',
    goals_html: '- Goals',
    solution_relevant_pain_points_html: '- Pain',
    solution_relevant_goals_html: '- Goals',
    current_solutions_html: '- Current',
    switching_costs_html: '- Costs',
    unsatisfied_with_html: '- Issues',
    ideal_outcome_html: '- Outcomes',
    buying_behavior: '- Behavior',
    digital_savviness: 'Tech-Savvy',
    is_decider: false,
    extra_field: 'should be rejected',
  };

  const result = safeParsePersonaRecommendation(responseWithExtra);

  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
});

Deno.test('Schema: validates experience_level is a number', () => {
  const responseWithStringExperience = {
    titles: ['Engineer'],
    experience_level: '5', // string instead of number
    job_responsibilities: '- Code',
    is_manager: false,
    department: 'Engineering',
    pain_points_html: '- Pain',
    goals_html: '- Goals',
    solution_relevant_pain_points_html: '- Pain',
    solution_relevant_goals_html: '- Goals',
    current_solutions_html: '- Current',
    switching_costs_html: '- Costs',
    unsatisfied_with_html: '- Issues',
    ideal_outcome_html: '- Outcomes',
    buying_behavior: '- Behavior',
    digital_savviness: 'Tech-Savvy',
    is_decider: false,
  };

  const result = safeParsePersonaRecommendation(responseWithStringExperience);

  assertEquals(result.success, false);
});

Deno.test('Schema: handles empty titles array', () => {
  const responseWithEmptyTitles = {
    titles: [],
    experience_level: 5,
    job_responsibilities: '- Code',
    is_manager: false,
    department: 'Engineering',
    pain_points_html: '- Pain',
    goals_html: '- Goals',
    solution_relevant_pain_points_html: '- Pain',
    solution_relevant_goals_html: '- Goals',
    current_solutions_html: '- Current',
    switching_costs_html: '- Costs',
    unsatisfied_with_html: '- Issues',
    ideal_outcome_html: '- Outcomes',
    buying_behavior: '- Behavior',
    digital_savviness: 'Tech-Savvy',
    is_decider: false,
  };

  const result = safeParsePersonaRecommendation(responseWithEmptyTitles);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.titles.length, 0);
  }
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: has correct structure for OpenAI', () => {
  assertExists(personaRecommendationJsonSchema);
  assertEquals(personaRecommendationJsonSchema.type, 'json_schema');
  assertExists(personaRecommendationJsonSchema.json_schema);
  assertEquals(personaRecommendationJsonSchema.json_schema.name, 'persona_recommendation');
  assertEquals(personaRecommendationJsonSchema.json_schema.strict, true);
});

Deno.test('JSON Schema: schema has required properties', () => {
  const schema = personaRecommendationJsonSchema.json_schema.schema as Record<string, unknown>;

  assertEquals(schema.type, 'object');
  assertExists(schema.properties);
  assertExists(schema.required);

  const props = schema.properties as Record<string, unknown>;
  assertExists(props.titles);
  assertExists(props.experience_level);
  assertExists(props.department);
  assertExists(props.digital_savviness);
});

// ============================================================================
// Contract Tests - Verify JSON Schema <-> Zod Schema alignment
// ============================================================================

Deno.test('Contract: JSON schema required fields match Zod schema', () => {
  const jsonSchema = personaRecommendationJsonSchema.json_schema.schema as Record<string, unknown>;
  const required = jsonSchema.required as string[];

  assert(required.includes('titles'));
  assert(required.includes('experience_level'));
  assert(required.includes('department'));
  assert(required.includes('digital_savviness'));

  // Zod should reject if required fields are missing
  const result = safeParsePersonaRecommendation({});
  assertEquals(result.success, false);
});

Deno.test('Contract: additionalProperties=false is enforced', () => {
  const jsonSchema = personaRecommendationJsonSchema.json_schema.schema as Record<string, unknown>;

  assertEquals(jsonSchema.additionalProperties, false);
});

Deno.test('Contract: OpenAI strict mode requirements met', () => {
  assertEquals(personaRecommendationJsonSchema.type, 'json_schema');
  assertEquals(personaRecommendationJsonSchema.json_schema.strict, true);

  const schema = personaRecommendationJsonSchema.json_schema.schema as Record<string, unknown>;
  assertEquals(schema.additionalProperties, false);
});

Deno.test('Contract: digital_savviness enum values match', () => {
  const jsonSchema = personaRecommendationJsonSchema.json_schema.schema as Record<string, unknown>;
  const props = jsonSchema.properties as Record<string, unknown>;
  const digitalSavviness = props.digital_savviness as Record<string, unknown>;

  // JSON Schema should have enum values
  assertExists(digitalSavviness.enum);
  const enumValues = digitalSavviness.enum as string[];

  // Verify key values are present
  assert(enumValues.includes('Tech-Savvy'));
  assert(enumValues.includes('Digital Novice'));
  assert(enumValues.includes('Power User'));
});
