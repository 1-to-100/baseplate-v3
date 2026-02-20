/**
 * Co-located tests for segments-ai Edge Function schema
 */
import { assertEquals, assert } from 'jsr:@std/assert@1';
import {
  RawAiSegmentResponseSchema,
  AskAiSegmentRequestSchema,
  safeParseRawAiSegmentResponse,
  safeParseAskAiSegmentRequest,
} from './schema.ts';
import {
  generateMock,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

Deno.test('Schema: validates generated mock for RawAiSegmentResponse', () => {
  const mock = generateMock(RawAiSegmentResponseSchema);
  const result = safeParseRawAiSegmentResponse(mock);
  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing name on RawAiSegmentResponse', () => {
  const invalid = generateInvalidMock(RawAiSegmentResponseSchema, ['name']);
  assertEquals(safeParseRawAiSegmentResponse(invalid).success, false);
});

Deno.test('Schema: rejects missing filters on RawAiSegmentResponse', () => {
  const invalid = generateInvalidMock(RawAiSegmentResponseSchema, ['filters']);
  assertEquals(safeParseRawAiSegmentResponse(invalid).success, false);
});

Deno.test('Schema: rejects extra fields on RawAiSegmentResponse (strict)', () => {
  const withExtra = generateMockWithExtra(RawAiSegmentResponseSchema, { extra: 'x' });
  assertEquals(safeParseRawAiSegmentResponse(withExtra).success, false);
});

Deno.test('Schema: validates AskAiSegmentRequest', () => {
  const mock = generateMock(AskAiSegmentRequestSchema);
  assertEquals(safeParseAskAiSegmentRequest(mock).success, true);
});

Deno.test('Schema: rejects missing description on request', () => {
  const invalid = generateInvalidMock(AskAiSegmentRequestSchema, ['description']);
  assertEquals(safeParseAskAiSegmentRequest(invalid).success, false);
});

Deno.test('Contract: RawAiSegmentResponse has name and filters', () => {
  const fields = getSchemaFields(RawAiSegmentResponseSchema);
  assert(fields.includes('name'));
  assert(fields.includes('filters'));
});
