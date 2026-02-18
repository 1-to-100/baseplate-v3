/**
 * Co-located tests for segments-update Edge Function schema
 */
import { assertEquals, assert } from 'jsr:@std/assert@1';
import {
  UpdateSegmentRequestSchema,
  UpdateSegmentResponseSchema,
  safeParseUpdateSegmentRequest,
  safeParseUpdateSegmentResponse,
} from './schema.ts';
import {
  generateMock,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

Deno.test('Schema: validates generated mock for UpdateSegmentRequest', () => {
  const mock = generateMock(UpdateSegmentRequestSchema);
  const result = safeParseUpdateSegmentRequest(mock);
  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing segment_id', () => {
  const invalid = generateInvalidMock(UpdateSegmentRequestSchema, ['segment_id']);
  assertEquals(safeParseUpdateSegmentRequest(invalid).success, false);
});

Deno.test('Schema: rejects extra fields on request (strict)', () => {
  const withExtra = generateMockWithExtra(UpdateSegmentRequestSchema, { extra: 'x' });
  assertEquals(safeParseUpdateSegmentRequest(withExtra).success, false);
});

Deno.test('Schema: validates generated mock for UpdateSegmentResponse', () => {
  const mock = generateMock(UpdateSegmentResponseSchema);
  assertEquals(safeParseUpdateSegmentResponse(mock).success, true);
});

Deno.test('Contract: request schema has segment_id, name, filters', () => {
  const fields = getSchemaFields(UpdateSegmentRequestSchema);
  assert(fields.includes('segment_id'));
  assert(fields.includes('name'));
  assert(fields.includes('filters'));
});
