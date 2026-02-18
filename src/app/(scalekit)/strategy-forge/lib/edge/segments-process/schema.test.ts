/**
 * Co-located schema tests for segments-process
 */
import { assertEquals, assert } from 'jsr:@std/assert@1';
import { ProcessSegmentRequestSchema, safeParseProcessSegmentRequest } from './schema.ts';
import {
  generateMock,
  generateInvalidMock,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

Deno.test('Schema: validates ProcessSegmentRequest', () => {
  const mock = generateMock(ProcessSegmentRequestSchema);
  assertEquals(safeParseProcessSegmentRequest(mock).success, true);
});

Deno.test('Schema: rejects missing segment_id', () => {
  const invalid = generateInvalidMock(ProcessSegmentRequestSchema, ['segment_id']);
  assertEquals(safeParseProcessSegmentRequest(invalid).success, false);
});

Deno.test('Schema: rejects missing customer_id', () => {
  const invalid = generateInvalidMock(ProcessSegmentRequestSchema, ['customer_id']);
  assertEquals(safeParseProcessSegmentRequest(invalid).success, false);
});

Deno.test('Contract: schema has segment_id and customer_id', () => {
  const fields = getSchemaFields(ProcessSegmentRequestSchema);
  assert(fields.includes('segment_id'));
  assert(fields.includes('customer_id'));
});
