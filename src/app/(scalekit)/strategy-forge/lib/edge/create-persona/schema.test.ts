/**
 * Co-located tests for create-persona Edge Function schema
 *
 * Run from this directory: deno task test
 */
import { assertEquals, assertExists, assert } from '@std/assert';
import {
  PersonaRecommendationSchema,
  safeParsePersonaRecommendation,
  personaRecommendationJsonSchema,
  DigitalSavvinessEnum,
} from './schema.ts';

// Import shared mock generator from testing directory
import {
  generateMock,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

// ============================================================================
// Schema Validation Tests
// ============================================================================

Deno.test('Schema: validates generated mock data', () => {
  const mockResponse = generateMock(PersonaRecommendationSchema);
  const result = safeParsePersonaRecommendation(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
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
  const invalidMock = generateInvalidMock(PersonaRecommendationSchema, [
    'experience_level',
    'department',
    'digital_savviness',
  ]);

  const result = safeParsePersonaRecommendation(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('experience_level'));
    assert(fieldErrors.includes('department'));
    assert(fieldErrors.includes('digital_savviness'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(PersonaRecommendationSchema, {
    extra_field: 'should be rejected',
  });

  const result = safeParsePersonaRecommendation(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: validates experience_level is a number', () => {
  const mock = generateMock(PersonaRecommendationSchema);
  // Manually set experience_level to a string to test type rejection
  const invalidMock = { ...mock, experience_level: '5' };

  const result = safeParsePersonaRecommendation(invalidMock);
  assertEquals(result.success, false);
});

Deno.test('Schema: handles empty titles array', () => {
  const mock = generateMock(PersonaRecommendationSchema);
  const mockWithEmptyTitles = { ...mock, titles: [] };

  const result = safeParsePersonaRecommendation(mockWithEmptyTitles);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.titles.length, 0);
  }
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(personaRecommendationJsonSchema);
  assertExists(personaRecommendationJsonSchema.json_schema);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(PersonaRecommendationSchema);

  assert(zodFields.includes('titles'));
  assert(zodFields.includes('experience_level'));
  assert(zodFields.includes('department'));
  assert(zodFields.includes('digital_savviness'));
  assert(zodFields.includes('is_decider'));
  assert(zodFields.includes('is_manager'));
});
