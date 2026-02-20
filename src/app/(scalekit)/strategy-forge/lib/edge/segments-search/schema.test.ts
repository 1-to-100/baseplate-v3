/**
 * Co-located schema tests for segments-search
 */
import { assertEquals, assert } from 'jsr:@std/assert@1';
import {
  SearchByFiltersRequestSchema,
  SearchByFiltersResponseSchema,
  CompanyPreviewSchema,
  safeParseSearchByFiltersRequest,
  safeParseSearchByFiltersResponse,
} from './schema.ts';
import {
  generateMock,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

Deno.test('Schema: validates SearchByFiltersRequest with filters', () => {
  const mock = generateMock(SearchByFiltersRequestSchema);
  assertEquals(safeParseSearchByFiltersRequest(mock).success, true);
});

Deno.test('Schema: rejects missing filters', () => {
  const invalid = generateInvalidMock(SearchByFiltersRequestSchema, ['filters']);
  assertEquals(safeParseSearchByFiltersRequest(invalid).success, false);
});

Deno.test('Schema: rejects extra fields on request (strict)', () => {
  const withExtra = generateMockWithExtra(SearchByFiltersRequestSchema, { extra: 'x' });
  assertEquals(safeParseSearchByFiltersRequest(withExtra).success, false);
});

Deno.test('Schema: validates CompanyPreview', () => {
  const mock = generateMock(CompanyPreviewSchema);
  assertEquals(CompanyPreviewSchema.safeParse(mock).success, true);
});

Deno.test('Schema: validates SearchByFiltersResponse', () => {
  const mock = generateMock(SearchByFiltersResponseSchema);
  assertEquals(safeParseSearchByFiltersResponse(mock).success, true);
});

Deno.test('Contract: request has filters', () => {
  const fields = getSchemaFields(SearchByFiltersRequestSchema);
  assert(fields.includes('filters'));
});
