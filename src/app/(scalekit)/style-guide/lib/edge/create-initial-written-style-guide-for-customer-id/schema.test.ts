/**
 * Co-located tests for create-initial-written-style-guide-for-customer-id Edge Function schema
 *
 * Run from this directory: deno task test
 */
import { assertEquals, assertExists, assert } from '@std/assert';
import {
  StyleGuideResponseSchema,
  safeParseStyleGuideResponse,
  styleGuideJsonSchema,
  FramingConceptSchema,
  VocabularyEntrySchema,
  VocabularyTypeEnum,
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
  const mockResponse = generateMock(StyleGuideResponseSchema);
  const result = safeParseStyleGuideResponse(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: accepts null for nullable fields', () => {
  const mock = generateMock(StyleGuideResponseSchema);
  const mockWithNulls = {
    ...mock,
    brand_personality: null,
    brand_voice: null,
    formality_option_item_id: null,
    sentence_length_option_item_id: null,
    pacing_option_item_id: null,
    humor_usage_option_item_id: null,
    storytelling_style_option_item_id: null,
    use_of_jargon_option_item_id: null,
    language_level_option_item_id: null,
    inclusivity_guidelines: null,
  };

  const result = safeParseStyleGuideResponse(mockWithNulls);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.brand_personality, null);
    assertEquals(result.data.formality_option_item_id, null);
  }
});

Deno.test('Schema: validates framing concept item', () => {
  const mockConcept = generateMock(FramingConceptSchema);
  const result = FramingConceptSchema.safeParse(mockConcept);

  assertEquals(result.success, true);
});

Deno.test('Schema: validates vocabulary entry item', () => {
  const mockEntry = generateMock(VocabularyEntrySchema);
  const result = VocabularyEntrySchema.safeParse(mockEntry);

  assertEquals(result.success, true);
});

Deno.test('Schema: validates all vocabulary_type values', () => {
  const validTypes = ['preferred', 'prohibited'];

  for (const type of validTypes) {
    const result = VocabularyTypeEnum.safeParse(type);
    assertEquals(result.success, true, `Should accept "${type}"`);
  }
});

Deno.test('Schema: rejects invalid vocabulary_type', () => {
  const result = VocabularyTypeEnum.safeParse('optional');
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(StyleGuideResponseSchema, [
    'framing_concepts',
    'vocabulary_entries',
  ]);

  const result = safeParseStyleGuideResponse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('framing_concepts'));
    assert(fieldErrors.includes('vocabulary_entries'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(StyleGuideResponseSchema, {
    extra_field: 'should be rejected',
  });

  const result = safeParseStyleGuideResponse(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: validates framing_concepts array items', () => {
  const mock = generateMock(StyleGuideResponseSchema);
  const invalidMock = {
    ...mock,
    framing_concepts: [{ name: 'Concept 1' }], // missing description
  };

  const result = safeParseStyleGuideResponse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('framing_concepts.0.description'));
  }
});

Deno.test('Schema: validates vocabulary_entries array items', () => {
  const mock = generateMock(StyleGuideResponseSchema);
  const invalidMock = {
    ...mock,
    vocabulary_entries: [{ name: 'term' }], // missing vocabulary_type
  };

  const result = safeParseStyleGuideResponse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('vocabulary_entries.0.vocabulary_type'));
  }
});

Deno.test('Schema: handles empty arrays', () => {
  const mock = generateMock(StyleGuideResponseSchema);
  const mockWithEmptyArrays = {
    ...mock,
    framing_concepts: [],
    vocabulary_entries: [],
  };

  const result = safeParseStyleGuideResponse(mockWithEmptyArrays);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.framing_concepts.length, 0);
    assertEquals(result.data.vocabulary_entries.length, 0);
  }
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(styleGuideJsonSchema);
  assertExists(styleGuideJsonSchema.schema);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(StyleGuideResponseSchema);

  assert(zodFields.includes('brand_personality'));
  assert(zodFields.includes('brand_voice'));
  assert(zodFields.includes('framing_concepts'));
  assert(zodFields.includes('vocabulary_entries'));
});

Deno.test('Contract: framing concept schema has expected fields', () => {
  const zodFields = getSchemaFields(FramingConceptSchema);
  assert(zodFields.includes('name'));
  assert(zodFields.includes('description'));
});
