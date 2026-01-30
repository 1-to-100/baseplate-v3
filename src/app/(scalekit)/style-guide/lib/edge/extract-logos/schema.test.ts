/**
 * Co-located tests for extract-logos Edge Function schema
 *
 * Run from this directory: deno task test
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert@1';
import {
  LogosResponseSchema,
  safeParseLogosResponse,
  logosJsonSchema,
  LogoAssetItemSchema,
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
  const mockResponse = generateMock(LogosResponseSchema);
  const result = safeParseLogosResponse(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: validates individual logo asset item', () => {
  const mockItem = generateMock(LogoAssetItemSchema);
  const result = LogoAssetItemSchema.safeParse(mockItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: accepts null for nullable fields', () => {
  const mock = generateMock(LogoAssetItemSchema);
  const mockWithNulls = {
    ...mock,
    description: null,
    file_url: null,
  };

  const result = LogoAssetItemSchema.safeParse(mockWithNulls);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.description, null);
    assertEquals(result.data.file_url, null);
  }
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(LogoAssetItemSchema, ['logo_type_option_id']);

  const result = LogoAssetItemSchema.safeParse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('logo_type_option_id'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(LogoAssetItemSchema, {
    extra_field: 'should be rejected',
  });

  const result = LogoAssetItemSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: handles empty logo_assets array', () => {
  const emptyResponse = { logo_assets: [] };
  const result = safeParseLogosResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.logo_assets.length, 0);
  }
});

Deno.test('Schema: rejects missing logo_assets field', () => {
  const result = safeParseLogosResponse({});

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('logo_assets'));
  }
});

Deno.test('Schema: rejects non-array logo_assets field', () => {
  const invalidResponse = { logo_assets: 'not an array' };
  const result = safeParseLogosResponse(invalidResponse);

  assertEquals(result.success, false);
});

Deno.test('Schema: rejects extra fields at root level', () => {
  const mockWithExtra = generateMockWithExtra(LogosResponseSchema, {
    extra_root_field: 'should be rejected',
  });

  const result = safeParseLogosResponse(mockWithExtra);
  assertEquals(result.success, false);
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(logosJsonSchema);
  assertExists(logosJsonSchema.schema);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(LogoAssetItemSchema);
  assert(zodFields.includes('logo_type_option_id'));
  assert(zodFields.includes('description'));
  assert(zodFields.includes('file_url'));
});
