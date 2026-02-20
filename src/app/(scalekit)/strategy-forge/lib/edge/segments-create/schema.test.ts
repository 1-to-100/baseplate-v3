/**
 * Co-located tests for segments-create Edge Function schema
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert@1';
import {
  CreateSegmentRequestSchema,
  CreateSegmentResponseSchema,
  SegmentFilterDtoSchema,
  safeParseCreateSegmentRequest,
  safeParseCreateSegmentResponse,
} from './schema.ts';
import {
  generateMock,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

Deno.test('Schema: validates generated mock for CreateSegmentRequest', () => {
  const mock = generateMock(CreateSegmentRequestSchema);
  const result = safeParseCreateSegmentRequest(mock);
  assertEquals(result.success, true);
});

Deno.test('Schema: validates generated mock for SegmentFilterDto', () => {
  const mock = generateMock(SegmentFilterDtoSchema);
  const result = SegmentFilterDtoSchema.safeParse(mock);
  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing required fields on request', () => {
  const invalid = generateInvalidMock(CreateSegmentRequestSchema, ['name']);
  const result = safeParseCreateSegmentRequest(invalid);
  assertEquals(result.success, false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    assert(paths.some((p) => p === 'name' || p.includes('name')));
  }
});

Deno.test('Schema: rejects missing filters on request', () => {
  const invalid = generateInvalidMock(CreateSegmentRequestSchema, ['filters']);
  const result = safeParseCreateSegmentRequest(invalid);
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects extra fields on request (strict)', () => {
  const withExtra = generateMockWithExtra(CreateSegmentRequestSchema, { extra: 'x' });
  const result = safeParseCreateSegmentRequest(withExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: validates generated mock for CreateSegmentResponse', () => {
  const mock = generateMock(CreateSegmentResponseSchema);
  const result = safeParseCreateSegmentResponse(mock);
  assertEquals(result.success, true);
});

Deno.test('Schema: rejects extra fields on response (strict)', () => {
  const withExtra = generateMockWithExtra(CreateSegmentResponseSchema, { extra: 'x' });
  const result = safeParseCreateSegmentResponse(withExtra);
  assertEquals(result.success, false);
});

Deno.test('Contract: request schema has expected fields', () => {
  const fields = getSchemaFields(CreateSegmentRequestSchema);
  assert(fields.includes('name'));
  assert(fields.includes('filters'));
});

Deno.test('Contract: response schema has list_id and customer_id', () => {
  const fields = getSchemaFields(CreateSegmentResponseSchema);
  assertExists(fields);
  assert(fields.includes('list_id'));
  assert(fields.includes('customer_id'));
});
