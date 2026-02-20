/**
 * Co-located tests for extract-colors Edge Function schema
 *
 * These tests live alongside the schema they validate, enabling:
 * - Faster feedback during development (tests run in function directory)
 * - Direct imports without complex relative paths
 * - Automatic discovery by CI workflow
 *
 * Run from this directory:
 *   deno task test
 *   deno task test:watch
 *
 * Run from repo root:
 *   deno test --allow-net --allow-env --allow-read src/app/(scalekit)/style-guide/lib/edge/extract-colors/
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert@1';
import {
  ColorsResponseSchema,
  PaletteColorItemSchema,
  UsageOptionEnum,
  colorsJsonSchema,
  safeParseColorsResponse,
} from './schema.ts';

// Import shared mock generator from testing directory
// Path: extract-colors -> edge -> lib -> style-guide -> (scalekit) -> app -> src -> repo root
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
  // Using mock generator - no manual fixture needed
  const mockResponse = generateMock(ColorsResponseSchema);
  const result = safeParseColorsResponse(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: validates all enum values', () => {
  const validOptions = ['primary', 'neutral', 'danger', 'success', 'warning'];

  for (const option of validOptions) {
    const result = UsageOptionEnum.safeParse(option);
    assertEquals(result.success, true, `Should accept "${option}"`);
  }
});

Deno.test('Schema: rejects invalid enum value', () => {
  const result = UsageOptionEnum.safeParse('invalid_option');
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(PaletteColorItemSchema, [
    'name',
    'usage_option',
    'sort_order',
  ]);

  const result = PaletteColorItemSchema.safeParse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('name'));
    assert(fieldErrors.includes('usage_option'));
    assert(fieldErrors.includes('sort_order'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(PaletteColorItemSchema, {
    extra_field: 'should be rejected',
  });

  const result = PaletteColorItemSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: handles empty array', () => {
  const emptyResponse = { palette_colors: [] };
  const result = safeParseColorsResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.palette_colors.length, 0);
  }
});

Deno.test('Schema: validates sort_order is a number', () => {
  const invalidResponse = {
    palette_colors: [
      {
        hex: '#FFFFFF',
        name: 'White',
        usage_option: 'background',
        sort_order: 'not a number', // should be number
      },
    ],
  };

  const result = safeParseColorsResponse(invalidResponse);
  assertEquals(result.success, false);
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(colorsJsonSchema);
  assertExists(colorsJsonSchema.schema);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(PaletteColorItemSchema);
  assert(zodFields.includes('hex'));
  assert(zodFields.includes('name'));
  assert(zodFields.includes('usage_option'));
  assert(zodFields.includes('sort_order'));
});
