/**
 * Tests for create-initial-customer-strategy-for-customer-id Edge Function schema
 *
 * Run: deno task test
 * Run single: deno test --allow-net --allow-env --allow-read create-initial-customer-strategy.test.ts
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import {
  safeParseStrategyResponse,
  strategyResponseJsonSchema,
  safeParseSupplementalStrategyItems,
  supplementalStrategyItemsJsonSchema,
} from '../../../src/app/(scalekit)/strategy-forge/lib/edge/create-initial-customer-strategy-for-customer-id/schema.ts';

// ============================================================================
// Schema Validation Tests (Unit Tests - No Network)
// ============================================================================

Deno.test('Schema: validates correct strategy response', () => {
  const validResponse = {
    company_name: 'Acme Corp',
    tagline: 'Building the future',
    one_sentence_summary: 'Acme Corp provides enterprise solutions.',
    problem_overview: 'Companies struggle with efficiency.',
    solution_overview: 'We automate complex workflows.',
    content_authoring_prompt: 'Write content for enterprise software.',
    mission: 'To empower businesses worldwide.',
    mission_description: 'We believe every business deserves great tools.',
    vision: 'A world where work is effortless.',
    vision_description: 'We envision automated, intelligent workplaces.',
    values: [
      { name: 'Innovation', description: 'We push boundaries constantly.' },
      { name: 'Integrity', description: 'We do the right thing always.' },
    ],
    principles: [
      { name: 'Customer First', description: 'Customers drive our decisions.' },
      { name: 'Quality', description: 'We never compromise on quality.' },
    ],
  };

  const result = safeParseStrategyResponse(validResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.company_name, 'Acme Corp');
    assertEquals(result.data.values.length, 2);
    assertEquals(result.data.principles.length, 2);
  }
});

Deno.test('Schema: accepts null for nullable fields', () => {
  const responseWithNulls = {
    company_name: null,
    tagline: null,
    one_sentence_summary: null,
    problem_overview: null,
    solution_overview: null,
    content_authoring_prompt: null,
    mission: 'To serve our customers.',
    mission_description: 'Detailed mission here.',
    vision: 'To be the best.',
    vision_description: 'Detailed vision here.',
    values: [],
    principles: [],
  };

  const result = safeParseStrategyResponse(responseWithNulls);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.company_name, null);
    assertEquals(result.data.tagline, null);
  }
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidResponse = {
    company_name: 'Acme Corp',
    // missing mission, vision, values, principles, etc.
  };

  const result = safeParseStrategyResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('mission'));
    assert(fieldErrors.includes('vision'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const responseWithExtra = {
    company_name: 'Acme Corp',
    tagline: null,
    one_sentence_summary: null,
    problem_overview: null,
    solution_overview: null,
    content_authoring_prompt: null,
    mission: 'Mission statement',
    mission_description: 'Mission description',
    vision: 'Vision statement',
    vision_description: 'Vision description',
    values: [],
    principles: [],
    extra_field: 'should be rejected',
  };

  const result = safeParseStrategyResponse(responseWithExtra);

  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
});

Deno.test('Schema: validates strategy items in values array', () => {
  const responseWithInvalidValue = {
    company_name: null,
    tagline: null,
    one_sentence_summary: null,
    problem_overview: null,
    solution_overview: null,
    content_authoring_prompt: null,
    mission: 'Mission',
    mission_description: 'Mission desc',
    vision: 'Vision',
    vision_description: 'Vision desc',
    values: [
      { name: 'Value 1' }, // missing description
    ],
    principles: [],
  };

  const result = safeParseStrategyResponse(responseWithInvalidValue);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('values.0.description'));
  }
});

// ============================================================================
// Supplemental Strategy Items Tests
// ============================================================================

Deno.test('Schema: validates supplemental strategy items array', () => {
  const validItems = [
    { name: 'Item 1', description: 'Description 1' },
    { name: 'Item 2', description: 'Description 2' },
  ];

  const result = safeParseSupplementalStrategyItems(validItems);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.length, 2);
  }
});

Deno.test('Schema: handles empty supplemental items array', () => {
  const result = safeParseSupplementalStrategyItems([]);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.length, 0);
  }
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: has correct structure for OpenAI', () => {
  assertExists(strategyResponseJsonSchema);
  assertEquals(strategyResponseJsonSchema.type, 'json_schema');
  assertEquals(strategyResponseJsonSchema.name, 'strategy_response');
  assertEquals(strategyResponseJsonSchema.strict, true);
  assertExists(strategyResponseJsonSchema.schema);
});

Deno.test('JSON Schema: supplemental items has correct structure', () => {
  assertExists(supplementalStrategyItemsJsonSchema);
  assertEquals(supplementalStrategyItemsJsonSchema.type, 'json_schema');
  assertEquals(supplementalStrategyItemsJsonSchema.name, 'strategy_items_response');
  assertEquals(supplementalStrategyItemsJsonSchema.strict, true);
});

Deno.test('JSON Schema: schema has required properties', () => {
  const schema = strategyResponseJsonSchema.schema as Record<string, unknown>;

  assertEquals(schema.type, 'object');
  assertExists(schema.properties);
  assertExists(schema.required);

  const props = schema.properties as Record<string, unknown>;
  assertExists(props.mission);
  assertExists(props.vision);
  assertExists(props.values);
  assertExists(props.principles);
});

// ============================================================================
// Contract Tests - Verify JSON Schema <-> Zod Schema alignment
// ============================================================================

Deno.test('Contract: JSON schema required fields match Zod schema', () => {
  const jsonSchema = strategyResponseJsonSchema.schema as Record<string, unknown>;
  const required = jsonSchema.required as string[];

  // These fields are required (non-nullable)
  assert(required.includes('mission'));
  assert(required.includes('vision'));
  assert(required.includes('values'));
  assert(required.includes('principles'));

  // Zod should reject if required fields are missing
  const result = safeParseStrategyResponse({});
  assertEquals(result.success, false);
});

Deno.test('Contract: additionalProperties=false is enforced', () => {
  const jsonSchema = strategyResponseJsonSchema.schema as Record<string, unknown>;

  assertEquals(jsonSchema.additionalProperties, false);
});

Deno.test('Contract: OpenAI strict mode requirements met', () => {
  assertEquals(strategyResponseJsonSchema.type, 'json_schema');
  assertEquals(strategyResponseJsonSchema.strict, true);

  const schema = strategyResponseJsonSchema.schema as Record<string, unknown>;
  assertEquals(schema.additionalProperties, false);
});
