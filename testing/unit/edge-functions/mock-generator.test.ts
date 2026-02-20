/**
 * Tests for the mock generator utility
 *
 * Run: deno task test
 */
import { assertEquals, assert, assertExists } from 'jsr:@std/assert';
import {
  generateMock,
  generateMockArray,
  generateMockWith,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
  isStrictSchema,
} from './mock-generator.ts';
import {
  ColorsResponseSchema,
  PaletteColorItemSchema,
  UsageOptionEnum,
  safeParseColorsResponse,
} from '../../../src/app/(scalekit)/style-guide/lib/edge/extract-colors/schema.ts';
import {
  CompetitorsResponseSchema,
  CompetitorItemSchema,
  safeParseCompetitorsResponse,
} from '../../../src/app/(scalekit)/strategy-forge/lib/edge/get-competitor-list-for-customer-id/schema.ts';

// ============================================================================
// Basic Generation Tests
// ============================================================================

Deno.test('Mock Generator: generates valid colors response', () => {
  const mock = generateMock(ColorsResponseSchema);

  const result = safeParseColorsResponse(mock);
  assertEquals(result.success, true, 'Generated mock should pass schema validation');

  if (result.success) {
    assertExists(result.data.palette_colors);
    assert(result.data.palette_colors.length > 0, 'Should generate array items');
  }
});

Deno.test('Mock Generator: generates valid competitors response', () => {
  const mock = generateMock(CompetitorsResponseSchema);

  const result = safeParseCompetitorsResponse(mock);
  assertEquals(result.success, true, 'Generated mock should pass schema validation');

  if (result.success) {
    assertExists(result.data.competitors);
    assert(result.data.competitors.length > 0, 'Should generate array items');
  }
});

Deno.test('Mock Generator: generates valid palette color item', () => {
  const mock = generateMock(PaletteColorItemSchema);

  const result = PaletteColorItemSchema.safeParse(mock);
  assertEquals(result.success, true, 'Generated mock should pass validation');

  if (result.success) {
    assertExists(result.data.hex);
    assertExists(result.data.name);
    assertExists(result.data.usage_option);
    assertExists(result.data.sort_order);
  }
});

Deno.test('Mock Generator: generates valid competitor item', () => {
  const mock = generateMock(CompetitorItemSchema);

  const result = CompetitorItemSchema.safeParse(mock);
  assertEquals(result.success, true, 'Generated mock should pass validation');

  if (result.success) {
    assertExists(result.data.name);
    assertExists(result.data.website_url);
    assertExists(result.data.description);
  }
});

// ============================================================================
// Array Generation Tests
// ============================================================================

Deno.test('Mock Generator: generateMockArray creates correct count', () => {
  const mocks = generateMockArray(PaletteColorItemSchema, 5);

  assertEquals(mocks.length, 5);

  for (const mock of mocks) {
    const result = PaletteColorItemSchema.safeParse(mock);
    assertEquals(result.success, true);
  }
});

Deno.test('Mock Generator: generates unique values across array items', () => {
  const mocks = generateMockArray(PaletteColorItemSchema, 3);

  const sortOrders = mocks.map((m) => m.sort_order);
  const uniqueSortOrders = new Set(sortOrders);

  assertEquals(uniqueSortOrders.size, 3, 'Each item should have unique sort_order');
});

// ============================================================================
// Override Tests
// ============================================================================

Deno.test('Mock Generator: generateMockWith applies overrides', () => {
  const mock = generateMockWith(PaletteColorItemSchema, {
    hex: '#CUSTOM',
    name: 'Custom Color',
  });

  assertEquals(mock.hex, '#CUSTOM');
  assertEquals(mock.name, 'Custom Color');

  // Other fields should still be generated
  assertExists(mock.usage_option);
  assertExists(mock.sort_order);
});

// ============================================================================
// Invalid Mock Generation Tests
// ============================================================================

Deno.test('Mock Generator: generateInvalidMock removes specified fields', () => {
  const invalidMock = generateInvalidMock(PaletteColorItemSchema, ['name', 'usage_option']);

  assertEquals('name' in invalidMock, false, 'name should be removed');
  assertEquals('usage_option' in invalidMock, false, 'usage_option should be removed');
  assertExists(invalidMock.hex, 'hex should remain');
  assertExists(invalidMock.sort_order, 'sort_order should remain');
});

Deno.test('Mock Generator: generateInvalidMock produces failing validation', () => {
  const invalidMock = generateInvalidMock(PaletteColorItemSchema, ['name']);

  const result = PaletteColorItemSchema.safeParse(invalidMock);
  assertEquals(result.success, false, 'Invalid mock should fail validation');
});

// ============================================================================
// Extra Fields Tests (Strict Mode)
// ============================================================================

Deno.test('Mock Generator: generateMockWithExtra adds extra fields', () => {
  const mockWithExtra = generateMockWithExtra(PaletteColorItemSchema, {
    extra_field: 'should be rejected',
  });

  assert('extra_field' in mockWithExtra, 'Extra field should be present');
  assertEquals(mockWithExtra.extra_field, 'should be rejected');
});

Deno.test('Mock Generator: extra fields cause strict validation to fail', () => {
  const mockWithExtra = generateMockWithExtra(PaletteColorItemSchema, {
    extra_field: 'should be rejected',
  });

  const result = PaletteColorItemSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false, 'Strict schema should reject extra fields');
});

// ============================================================================
// Schema Introspection Tests
// ============================================================================

Deno.test('Mock Generator: getSchemaFields returns all fields', () => {
  const fields = getSchemaFields(PaletteColorItemSchema);

  assert(fields.includes('hex'));
  assert(fields.includes('name'));
  assert(fields.includes('usage_option'));
  assert(fields.includes('sort_order'));
  assertEquals(fields.length, 4);
});

Deno.test('Mock Generator: isStrictSchema detects strict mode', () => {
  const isStrict = isStrictSchema(PaletteColorItemSchema);
  assertEquals(isStrict, true, 'PaletteColorItemSchema has .strict()');
});

// ============================================================================
// Enum Value Tests
// ============================================================================

Deno.test('Mock Generator: generates valid enum values', () => {
  const mocks = generateMockArray(PaletteColorItemSchema, 10);
  const validOptions = ['primary', 'neutral', 'danger', 'success', 'warning'];

  for (const mock of mocks) {
    assert(
      validOptions.includes(mock.usage_option),
      `usage_option "${mock.usage_option}" should be valid`
    );
  }
});

// ============================================================================
// Field Type Detection Tests
// ============================================================================

Deno.test('Mock Generator: generates URL-like values for URL fields', () => {
  const mock = generateMock(CompetitorItemSchema);

  assert(
    mock.website_url.startsWith('https://'),
    'website_url should be a valid URL'
  );
});

Deno.test('Mock Generator: generates hex color for hex fields', () => {
  const mock = generateMock(PaletteColorItemSchema);

  assert(
    mock.hex.startsWith('#'),
    'hex should start with #'
  );
});

Deno.test('Mock Generator: generates integer for sort_order', () => {
  const mock = generateMock(PaletteColorItemSchema);

  assertEquals(
    Number.isInteger(mock.sort_order),
    true,
    'sort_order should be an integer'
  );
});
