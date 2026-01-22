/**
 * Co-located tests for suggest-segments-for-customer-id Edge Function schema
 *
 * Run from this directory: deno task test
 */
import { assertEquals, assertExists, assert } from '@std/assert';
import {
  SegmentsResponseSchema,
  safeParseSegmentsResponse,
  segmentsJsonSchema,
  SegmentItemSchema,
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
  const mockResponse = generateMock(SegmentsResponseSchema);
  const result = safeParseSegmentsResponse(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: validates individual segment item', () => {
  const mockItem = generateMock(SegmentItemSchema);
  const result = SegmentItemSchema.safeParse(mockItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(SegmentItemSchema, ['description']);

  const result = SegmentItemSchema.safeParse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('description'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(SegmentItemSchema, {
    extra_field: 'should be rejected',
  });

  const result = SegmentItemSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: handles empty segments array', () => {
  const emptyResponse = { segments: [] };
  const result = safeParseSegmentsResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.segments.length, 0);
  }
});

Deno.test('Schema: rejects missing segments field', () => {
  const result = safeParseSegmentsResponse({});

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('segments'));
  }
});

Deno.test('Schema: rejects non-array segments field', () => {
  const invalidResponse = { segments: 'not an array' };
  const result = safeParseSegmentsResponse(invalidResponse);

  assertEquals(result.success, false);
});

Deno.test('Schema: rejects extra fields at root level', () => {
  const mockWithExtra = generateMockWithExtra(SegmentsResponseSchema, {
    extra_root_field: 'should be rejected',
  });

  const result = safeParseSegmentsResponse(mockWithExtra);
  assertEquals(result.success, false);
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(segmentsJsonSchema);
  assertExists(segmentsJsonSchema.schema);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(SegmentItemSchema);
  assert(zodFields.includes('name'));
  assert(zodFields.includes('description'));
});
