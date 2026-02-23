/**
 * Co-located schema tests for industries-smart-search
 */
import { assertEquals, assert } from 'jsr:@std/assert@1';
import {
  SmartSearchRequestSchema,
  SmartSearchResultSchema,
  safeParseSmartSearchRequest,
} from './schema.ts';
import {
  generateMock,
  generateInvalidMock,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

Deno.test('Schema: validates SmartSearchRequest with query', () => {
  const mock = generateMock(SmartSearchRequestSchema);
  assertEquals(safeParseSmartSearchRequest(mock).success, true);
});

Deno.test('Schema: rejects missing query', () => {
  const invalid = generateInvalidMock(SmartSearchRequestSchema, ['query']);
  assertEquals(safeParseSmartSearchRequest(invalid).success, false);
});

Deno.test('Schema: validates SmartSearchResult', () => {
  const mock = generateMock(SmartSearchResultSchema);
  assertEquals(SmartSearchResultSchema.safeParse(mock).success, true);
});

Deno.test('Contract: SmartSearchResult has industry_id, value, score', () => {
  const fields = getSchemaFields(SmartSearchResultSchema);
  assert(fields.includes('industry_id'));
  assert(fields.includes('value'));
  assert(fields.includes('score'));
});
