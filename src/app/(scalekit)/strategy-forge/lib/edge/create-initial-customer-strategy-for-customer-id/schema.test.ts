/**
 * Co-located tests for create-initial-customer-strategy-for-customer-id Edge Function schema
 *
 * Run from this directory: deno task test
 */
import { assertEquals, assertExists, assert } from '@std/assert';
import {
  StrategyResponseSchema,
  safeParseStrategyResponse,
  strategyResponseJsonSchema,
  StrategyItemSchema,
  SupplementalStrategyItemsSchema,
  safeParseSupplementalStrategyItems,
  supplementalStrategyItemsJsonSchema,
} from './schema.ts';

// Import shared mock generator from testing directory
import {
  generateMock,
  generateMockArray,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

// ============================================================================
// Schema Validation Tests
// ============================================================================

Deno.test('Schema: validates generated mock data', () => {
  const mockResponse = generateMock(StrategyResponseSchema);
  const result = safeParseStrategyResponse(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: accepts null for nullable fields', () => {
  const mock = generateMock(StrategyResponseSchema);
  const mockWithNulls = {
    ...mock,
    company_name: null,
    tagline: null,
    one_sentence_summary: null,
    problem_overview: null,
    solution_overview: null,
    content_authoring_prompt: null,
  };

  const result = safeParseStrategyResponse(mockWithNulls);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.company_name, null);
    assertEquals(result.data.tagline, null);
  }
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(StrategyResponseSchema, ['mission', 'vision']);

  const result = safeParseStrategyResponse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('mission'));
    assert(fieldErrors.includes('vision'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(StrategyResponseSchema, {
    extra_field: 'should be rejected',
  });

  const result = safeParseStrategyResponse(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: validates strategy items in values array', () => {
  const mock = generateMock(StrategyResponseSchema);
  // Manually corrupt the values array
  const invalidMock = {
    ...mock,
    values: [{ name: 'Value 1' }], // missing description
  };

  const result = safeParseStrategyResponse(invalidMock);
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
  const validItems = generateMockArray(StrategyItemSchema, 2);
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

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(strategyResponseJsonSchema);
  assertExists(strategyResponseJsonSchema.schema);
});

Deno.test('JSON Schema: exports valid supplemental items schema', () => {
  assertExists(supplementalStrategyItemsJsonSchema);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(StrategyResponseSchema);

  assert(zodFields.includes('mission'));
  assert(zodFields.includes('vision'));
  assert(zodFields.includes('values'));
  assert(zodFields.includes('principles'));
});

Deno.test('Contract: strategy item schema has expected fields', () => {
  const zodFields = getSchemaFields(StrategyItemSchema);
  assert(zodFields.includes('name'));
  assert(zodFields.includes('description'));
});
