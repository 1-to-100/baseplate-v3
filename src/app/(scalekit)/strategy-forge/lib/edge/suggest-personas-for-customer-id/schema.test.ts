/**
 * Co-located tests for suggest-personas-for-customer-id Edge Function schema
 *
 * Run from this directory: deno task test
 */
import { assertEquals, assertExists, assert } from '@std/assert';
import {
  PersonasResponseSchema,
  safeParsePersonasResponse,
  personasJsonSchema,
  PersonaItemSchema,
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
  const mockResponse = generateMock(PersonasResponseSchema);
  const result = safeParsePersonasResponse(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: validates individual persona item', () => {
  const mockItem = generateMock(PersonaItemSchema);
  const result = PersonaItemSchema.safeParse(mockItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(PersonaItemSchema, ['description']);

  const result = PersonaItemSchema.safeParse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('description'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(PersonaItemSchema, {
    extra_field: 'should be rejected',
  });

  const result = PersonaItemSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: handles empty personas array', () => {
  const emptyResponse = { personas: [] };
  const result = safeParsePersonasResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.personas.length, 0);
  }
});

Deno.test('Schema: rejects missing personas field', () => {
  const result = safeParsePersonasResponse({});

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('personas'));
  }
});

Deno.test('Schema: rejects non-array personas field', () => {
  const invalidResponse = { personas: 'not an array' };
  const result = safeParsePersonasResponse(invalidResponse);

  assertEquals(result.success, false);
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(personasJsonSchema);
  assertExists(personasJsonSchema.schema);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(PersonaItemSchema);
  assert(zodFields.includes('name'));
  assert(zodFields.includes('description'));
});
