/**
 * Co-located tests for get-competitor-list-for-customer-id Edge Function schema
 *
 * Run from this directory: deno task test
 */
import { assertEquals, assertExists, assert } from '@std/assert';
import {
  CompetitorsResponseSchema,
  safeParseCompetitorsResponse,
  competitorsJsonSchema,
  CompetitorItemSchema,
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
  const mockResponse = generateMock(CompetitorsResponseSchema);
  const result = safeParseCompetitorsResponse(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: validates individual competitor item', () => {
  const mockItem = generateMock(CompetitorItemSchema);
  const result = CompetitorItemSchema.safeParse(mockItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(CompetitorItemSchema, ['website_url', 'description']);

  const result = CompetitorItemSchema.safeParse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('website_url'));
    assert(fieldErrors.includes('description'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(CompetitorItemSchema, {
    extra_field: 'should be rejected',
  });

  const result = CompetitorItemSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: handles empty competitors array', () => {
  const emptyResponse = { competitors: [] };
  const result = safeParseCompetitorsResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.competitors.length, 0);
  }
});

Deno.test('Schema: rejects missing competitors field', () => {
  const result = safeParseCompetitorsResponse({});

  assertEquals(result.success, false);
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(competitorsJsonSchema);
  assertExists(competitorsJsonSchema.schema);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(CompetitorItemSchema);
  assert(zodFields.includes('name'));
  assert(zodFields.includes('website_url'));
  assert(zodFields.includes('description'));
});
