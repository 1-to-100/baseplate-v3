/**
 * Co-located tests for company-scoring Edge Function schema
 */
import { assertEquals, assert } from 'jsr:@std/assert@1';
import {
  CompanyScoringResultSchema,
  CompanyScoringRequestSchema,
  safeParseCompanyScoringResult,
  safeParseCompanyScoringRequest,
} from './schema.ts';
import {
  generateMock,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

Deno.test('Schema: validates generated mock for CompanyScoringResult', () => {
  const mock = generateMock(CompanyScoringResultSchema);
  assertEquals(safeParseCompanyScoringResult(mock).success, true);
});

Deno.test('Schema: rejects score out of range', () => {
  assertEquals(
    safeParseCompanyScoringResult({ score: 11, short_description: 'x', full_description: 'y' })
      .success,
    false
  );
  assertEquals(
    safeParseCompanyScoringResult({ score: -1, short_description: 'x', full_description: 'y' })
      .success,
    false
  );
});

Deno.test('Schema: rejects missing required fields on result', () => {
  const invalid = generateInvalidMock(CompanyScoringResultSchema, ['short_description']);
  assertEquals(safeParseCompanyScoringResult(invalid).success, false);
});

Deno.test('Schema: rejects extra fields on result (strict)', () => {
  const withExtra = generateMockWithExtra(CompanyScoringResultSchema, { extra: 'x' });
  assertEquals(safeParseCompanyScoringResult(withExtra).success, false);
});

Deno.test('Schema: validates request with valid UUIDs', () => {
  const valid = {
    company_id: 'a1b2c3d4-e5f6-4780-a123-456789abcdef',
    customer_id: 'b2c3d4e5-f6a7-4891-b234-567890abcdef',
  };
  assertEquals(safeParseCompanyScoringRequest(valid).success, true);
});

Deno.test('Schema: rejects request with invalid UUID', () => {
  assertEquals(
    safeParseCompanyScoringRequest({
      company_id: 'not-uuid',
      customer_id: 'a1b2c3d4-e5f6-4780-a123-456789abcdef',
    }).success,
    false
  );
});

Deno.test('Contract: result schema has score, short_description, full_description', () => {
  const fields = getSchemaFields(CompanyScoringResultSchema);
  assert(fields.includes('score'));
  assert(fields.includes('short_description'));
  assert(fields.includes('full_description'));
});
