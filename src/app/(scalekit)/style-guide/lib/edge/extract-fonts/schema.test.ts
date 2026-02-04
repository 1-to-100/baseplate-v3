/**
 * Co-located tests for extract-fonts Edge Function schema
 *
 * Run from this directory: deno task test
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert@1';
import {
  TypographyResponseSchema,
  safeParseTypographyResponse,
  typographyJsonSchema,
  TypographyStyleItemSchema,
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
  const mockResponse = generateMock(TypographyResponseSchema);
  const result = safeParseTypographyResponse(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: validates individual typography style item', () => {
  const mockItem = generateMock(TypographyStyleItemSchema);
  const result = TypographyStyleItemSchema.safeParse(mockItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: accepts null for nullable fields', () => {
  const mock = generateMock(TypographyStyleItemSchema);
  const mockWithNulls = {
    ...mock,
    font_option_id: null,
    line_height: null,
    font_weight: null,
    color: null,
  };

  const result = TypographyStyleItemSchema.safeParse(mockWithNulls);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.font_option_id, null);
    assertEquals(result.data.line_height, null);
  }
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(TypographyStyleItemSchema, [
    'font_family',
    'font_size_px',
  ]);

  const result = TypographyStyleItemSchema.safeParse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('font_family'));
    assert(fieldErrors.includes('font_size_px'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(TypographyStyleItemSchema, {
    extra_field: 'should be rejected',
  });

  const result = TypographyStyleItemSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: handles empty typography_styles array', () => {
  const emptyResponse = { typography_styles: [] };
  const result = safeParseTypographyResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.typography_styles.length, 0);
  }
});

Deno.test('Schema: rejects missing typography_styles field', () => {
  const result = safeParseTypographyResponse({});

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('typography_styles'));
  }
});

Deno.test('Schema: validates font_size_px is a number', () => {
  const mock = generateMock(TypographyStyleItemSchema);
  // font_size_px should be a number (int validation is schema-defined)
  const invalidMock = { ...mock, font_size_px: 'not a number' };

  const result = TypographyStyleItemSchema.safeParse(invalidMock);
  assertEquals(result.success, false);
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(typographyJsonSchema);
  assertExists(typographyJsonSchema.schema);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(TypographyStyleItemSchema);

  assert(zodFields.includes('typography_style_option_id'));
  assert(zodFields.includes('font_option_id'));
  assert(zodFields.includes('font_family'));
  assert(zodFields.includes('font_size_px'));
});
