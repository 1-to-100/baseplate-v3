/**
 * Tests for create-initial-written-style-guide-for-customer-id Edge Function schema
 *
 * Run: deno task test
 * Run single: deno test --allow-net --allow-env --allow-read create-initial-written-style-guide.test.ts
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import {
  safeParseStyleGuideResponse,
  styleGuideJsonSchema,
  FramingConceptSchema,
  VocabularyEntrySchema,
  VocabularyTypeEnum,
} from '../../../src/app/(scalekit)/style-guide/lib/edge/create-initial-written-style-guide-for-customer-id/schema.ts';

// ============================================================================
// Schema Validation Tests (Unit Tests - No Network)
// ============================================================================

Deno.test('Schema: validates correct style guide response', () => {
  const validResponse = {
    brand_personality: 'Professional yet approachable, with a focus on innovation and reliability.',
    brand_voice: 'Trustworthy, Innovative, Professional, Empathetic',
    formality_option_item_id: '550e8400-e29b-41d4-a716-446655440001',
    sentence_length_option_item_id: '550e8400-e29b-41d4-a716-446655440002',
    pacing_option_item_id: '550e8400-e29b-41d4-a716-446655440003',
    humor_usage_option_item_id: '550e8400-e29b-41d4-a716-446655440004',
    storytelling_style_option_item_id: '550e8400-e29b-41d4-a716-446655440005',
    use_of_jargon_option_item_id: '550e8400-e29b-41d4-a716-446655440006',
    language_level_option_item_id: '550e8400-e29b-41d4-a716-446655440007',
    inclusivity_guidelines: 'Use gender-neutral pronouns. Avoid jargon that excludes non-technical readers.',
    framing_concepts: [
      {
        name: 'Journey to Success',
        description: 'Frame the customer journey as a transformative path from challenges to achievement.',
      },
    ],
    vocabulary_entries: [
      {
        name: 'synergy',
        vocabulary_type: 'prohibited',
        suggested_replacement: 'collaboration',
        example_usage: null,
      },
      {
        name: 'end-to-end solution',
        vocabulary_type: 'preferred',
        suggested_replacement: null,
        example_usage: 'Our end-to-end solution handles everything from design to deployment.',
      },
    ],
  };

  const result = safeParseStyleGuideResponse(validResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.brand_voice, 'Trustworthy, Innovative, Professional, Empathetic');
    assertEquals(result.data.framing_concepts.length, 1);
    assertEquals(result.data.vocabulary_entries.length, 2);
  }
});

Deno.test('Schema: accepts null for nullable fields', () => {
  const responseWithNulls = {
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
    framing_concepts: [],
    vocabulary_entries: [],
  };

  const result = safeParseStyleGuideResponse(responseWithNulls);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.brand_personality, null);
    assertEquals(result.data.formality_option_item_id, null);
  }
});

Deno.test('Schema: validates framing concept item', () => {
  const validConcept = {
    name: 'Building Blocks',
    description: 'Use building blocks as a metaphor for modular, composable solutions.',
  };

  const result = FramingConceptSchema.safeParse(validConcept);

  assertEquals(result.success, true);
});

Deno.test('Schema: validates vocabulary entry item', () => {
  const validEntry = {
    name: 'leverage',
    vocabulary_type: 'prohibited',
    suggested_replacement: 'use',
    example_usage: null,
  };

  const result = VocabularyEntrySchema.safeParse(validEntry);

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
  const invalidResponse = {
    brand_personality: 'Test',
    // missing all other required fields
  };

  const result = safeParseStyleGuideResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('framing_concepts'));
    assert(fieldErrors.includes('vocabulary_entries'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const responseWithExtra = {
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
    framing_concepts: [],
    vocabulary_entries: [],
    extra_field: 'should be rejected',
  };

  const result = safeParseStyleGuideResponse(responseWithExtra);

  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
});

Deno.test('Schema: validates framing_concepts array items', () => {
  const responseWithInvalidConcept = {
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
    framing_concepts: [
      { name: 'Concept 1' }, // missing description
    ],
    vocabulary_entries: [],
  };

  const result = safeParseStyleGuideResponse(responseWithInvalidConcept);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('framing_concepts.0.description'));
  }
});

Deno.test('Schema: validates vocabulary_entries array items', () => {
  const responseWithInvalidEntry = {
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
    framing_concepts: [],
    vocabulary_entries: [
      { name: 'term' }, // missing vocabulary_type
    ],
  };

  const result = safeParseStyleGuideResponse(responseWithInvalidEntry);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('vocabulary_entries.0.vocabulary_type'));
  }
});

Deno.test('Schema: handles empty arrays', () => {
  const responseWithEmptyArrays = {
    brand_personality: 'Test personality',
    brand_voice: 'Bold, Confident',
    formality_option_item_id: '550e8400-e29b-41d4-a716-446655440001',
    sentence_length_option_item_id: null,
    pacing_option_item_id: null,
    humor_usage_option_item_id: null,
    storytelling_style_option_item_id: null,
    use_of_jargon_option_item_id: null,
    language_level_option_item_id: null,
    inclusivity_guidelines: null,
    framing_concepts: [],
    vocabulary_entries: [],
  };

  const result = safeParseStyleGuideResponse(responseWithEmptyArrays);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.framing_concepts.length, 0);
    assertEquals(result.data.vocabulary_entries.length, 0);
  }
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: has correct structure for OpenAI', () => {
  assertExists(styleGuideJsonSchema);
  assertEquals(styleGuideJsonSchema.type, 'json_schema');
  assertEquals(styleGuideJsonSchema.name, 'style_guide_response');
  assertEquals(styleGuideJsonSchema.strict, true);
  assertExists(styleGuideJsonSchema.schema);
});

Deno.test('JSON Schema: schema has required properties', () => {
  const schema = styleGuideJsonSchema.schema as Record<string, unknown>;

  assertEquals(schema.type, 'object');
  assertExists(schema.properties);
  assertExists(schema.required);

  const props = schema.properties as Record<string, unknown>;
  assertExists(props.brand_personality);
  assertExists(props.brand_voice);
  assertExists(props.framing_concepts);
  assertExists(props.vocabulary_entries);
});

Deno.test('JSON Schema: framing_concepts array has correct item schema', () => {
  const schema = styleGuideJsonSchema.schema as Record<string, unknown>;
  const props = schema.properties as Record<string, unknown>;
  const framingConcepts = props.framing_concepts as Record<string, unknown>;

  assertEquals(framingConcepts.type, 'array');
  assertExists(framingConcepts.items);

  const items = framingConcepts.items as Record<string, unknown>;
  assertEquals(items.type, 'object');
  assertExists(items.properties);

  const itemProps = items.properties as Record<string, unknown>;
  assertExists(itemProps.name);
  assertExists(itemProps.description);
});

Deno.test('JSON Schema: vocabulary_entries array has correct item schema', () => {
  const schema = styleGuideJsonSchema.schema as Record<string, unknown>;
  const props = schema.properties as Record<string, unknown>;
  const vocabularyEntries = props.vocabulary_entries as Record<string, unknown>;

  assertEquals(vocabularyEntries.type, 'array');
  assertExists(vocabularyEntries.items);

  const items = vocabularyEntries.items as Record<string, unknown>;
  assertEquals(items.type, 'object');
  assertExists(items.properties);

  const itemProps = items.properties as Record<string, unknown>;
  assertExists(itemProps.name);
  assertExists(itemProps.vocabulary_type);
  assertExists(itemProps.suggested_replacement);
  assertExists(itemProps.example_usage);
});

// ============================================================================
// Contract Tests - Verify JSON Schema <-> Zod Schema alignment
// ============================================================================

Deno.test('Contract: JSON schema required fields match Zod schema', () => {
  const jsonSchema = styleGuideJsonSchema.schema as Record<string, unknown>;
  const required = jsonSchema.required as string[];

  assert(required.includes('framing_concepts'));
  assert(required.includes('vocabulary_entries'));

  // Zod should reject if required fields are missing
  const result = safeParseStyleGuideResponse({});
  assertEquals(result.success, false);
});

Deno.test('Contract: additionalProperties=false is enforced', () => {
  const jsonSchema = styleGuideJsonSchema.schema as Record<string, unknown>;

  assertEquals(jsonSchema.additionalProperties, false);
});

Deno.test('Contract: OpenAI strict mode requirements met', () => {
  assertEquals(styleGuideJsonSchema.type, 'json_schema');
  assertEquals(styleGuideJsonSchema.strict, true);

  const schema = styleGuideJsonSchema.schema as Record<string, unknown>;
  assertEquals(schema.additionalProperties, false);
});

Deno.test('Contract: vocabulary_type enum values match', () => {
  const jsonSchema = styleGuideJsonSchema.schema as Record<string, unknown>;
  const props = jsonSchema.properties as Record<string, unknown>;
  const vocabularyEntries = props.vocabulary_entries as Record<string, unknown>;
  const items = vocabularyEntries.items as Record<string, unknown>;
  const itemProps = items.properties as Record<string, unknown>;
  const vocabularyType = itemProps.vocabulary_type as Record<string, unknown>;

  // JSON Schema should have enum values
  assertExists(vocabularyType.enum);
  const enumValues = vocabularyType.enum as string[];

  // Verify key values are present
  assert(enumValues.includes('preferred'));
  assert(enumValues.includes('prohibited'));
});

Deno.test('Contract: complete valid response passes both schemas', () => {
  const completeResponse = {
    brand_personality: 'Innovative and trustworthy, always putting the customer first.',
    brand_voice: 'Professional, Confident, Approachable, Expert',
    formality_option_item_id: '550e8400-e29b-41d4-a716-446655440001',
    sentence_length_option_item_id: '550e8400-e29b-41d4-a716-446655440002',
    pacing_option_item_id: '550e8400-e29b-41d4-a716-446655440003',
    humor_usage_option_item_id: '550e8400-e29b-41d4-a716-446655440004',
    storytelling_style_option_item_id: '550e8400-e29b-41d4-a716-446655440005',
    use_of_jargon_option_item_id: '550e8400-e29b-41d4-a716-446655440006',
    language_level_option_item_id: '550e8400-e29b-41d4-a716-446655440007',
    inclusivity_guidelines: 'Use they/them when gender is unknown. Avoid ableist language.',
    framing_concepts: [
      {
        name: 'Digital Transformation',
        description: 'Frame technological adoption as a journey of business transformation and growth.',
      },
      {
        name: 'Partnership',
        description: 'Position the relationship with customers as a collaborative partnership.',
      },
    ],
    vocabulary_entries: [
      {
        name: 'cutting-edge',
        vocabulary_type: 'preferred',
        suggested_replacement: null,
        example_usage: 'Our cutting-edge technology delivers results.',
      },
      {
        name: 'disrupt',
        vocabulary_type: 'prohibited',
        suggested_replacement: 'transform',
        example_usage: null,
      },
    ],
  };

  const result = safeParseStyleGuideResponse(completeResponse);
  assertEquals(result.success, true, 'Complete valid response should pass Zod validation');
});
