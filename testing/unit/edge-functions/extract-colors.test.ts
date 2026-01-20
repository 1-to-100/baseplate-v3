/**
 * Tests for extract-colors Edge Function schema
 *
 * Run: deno task test
 * Run single: deno test --allow-net --allow-env --allow-read extract-colors.test.ts
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import {
  safeParseColorsResponse,
  colorsJsonSchema,
  PaletteColorItemSchema,
  UsageOptionEnum,
} from '../../../src/app/(scalekit)/style-guide/lib/edge/extract-colors/schema.ts';

// ============================================================================
// Schema Validation Tests (Unit Tests - No Network)
// ============================================================================

Deno.test('Schema: validates correct colors response', () => {
  const validResponse = {
    palette_colors: [
      {
        hex: '#FFFFFF',
        name: 'Background White',
        usage_option: 'background',
        sort_order: 1,
      },
      {
        hex: '#1976D2',
        name: 'Primary Blue',
        usage_option: 'primary',
        sort_order: 2,
      },
      {
        hex: '#333333',
        name: 'Text Dark Gray',
        usage_option: 'foreground',
        sort_order: 3,
      },
    ],
  };

  const result = safeParseColorsResponse(validResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.palette_colors.length, 3);
    assertEquals(result.data.palette_colors[0].hex, '#FFFFFF');
    assertEquals(result.data.palette_colors[1].usage_option, 'primary');
  }
});

Deno.test('Schema: validates individual palette color item', () => {
  const validItem = {
    hex: '#FF5733',
    name: 'Accent Orange',
    usage_option: 'accent',
    sort_order: 5,
  };

  const result = PaletteColorItemSchema.safeParse(validItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: validates all usage_option values', () => {
  const validOptions = ['primary', 'secondary', 'foreground', 'background', 'accent'];

  for (const option of validOptions) {
    const result = UsageOptionEnum.safeParse(option);
    assertEquals(result.success, true, `Should accept "${option}"`);
  }
});

Deno.test('Schema: rejects invalid usage_option', () => {
  const result = UsageOptionEnum.safeParse('invalid_option');
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidResponse = {
    palette_colors: [
      {
        hex: '#FFFFFF',
        // missing name, usage_option, sort_order
      },
    ],
  };

  const result = safeParseColorsResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('palette_colors.0.name'));
    assert(fieldErrors.includes('palette_colors.0.usage_option'));
    assert(fieldErrors.includes('palette_colors.0.sort_order'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const responseWithExtra = {
    palette_colors: [
      {
        hex: '#FFFFFF',
        name: 'White',
        usage_option: 'background',
        sort_order: 1,
        extra_field: 'should be rejected',
      },
    ],
  };

  const result = safeParseColorsResponse(responseWithExtra);

  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
});

Deno.test('Schema: handles empty palette_colors array', () => {
  const emptyResponse = { palette_colors: [] };

  const result = safeParseColorsResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.palette_colors.length, 0);
  }
});

Deno.test('Schema: rejects missing palette_colors field', () => {
  const result = safeParseColorsResponse({});

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('palette_colors'));
  }
});

Deno.test('Schema: rejects non-integer sort_order', () => {
  const invalidResponse = {
    palette_colors: [
      {
        hex: '#FFFFFF',
        name: 'White',
        usage_option: 'background',
        sort_order: 1.5, // should be integer
      },
    ],
  };

  const result = safeParseColorsResponse(invalidResponse);

  assertEquals(result.success, false);
});

Deno.test('Schema: rejects extra fields at root level', () => {
  const responseWithRootExtra = {
    palette_colors: [],
    extra_root_field: 'should be rejected',
  };

  const result = safeParseColorsResponse(responseWithRootExtra);

  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: has correct structure for OpenAI', () => {
  assertExists(colorsJsonSchema);
  assertEquals(colorsJsonSchema.type, 'json_schema');
  assertEquals(colorsJsonSchema.name, 'color_extraction_response');
  assertEquals(colorsJsonSchema.strict, true);
  assertExists(colorsJsonSchema.schema);
});

Deno.test('JSON Schema: schema has required properties', () => {
  const schema = colorsJsonSchema.schema as Record<string, unknown>;

  assertEquals(schema.type, 'object');
  assertExists(schema.properties);
  assertExists(schema.required);

  const props = schema.properties as Record<string, unknown>;
  assertExists(props.palette_colors);
});

Deno.test('JSON Schema: palette_colors array has correct item schema', () => {
  const schema = colorsJsonSchema.schema as Record<string, unknown>;
  const props = schema.properties as Record<string, unknown>;
  const paletteColors = props.palette_colors as Record<string, unknown>;

  assertEquals(paletteColors.type, 'array');
  assertExists(paletteColors.items);

  const items = paletteColors.items as Record<string, unknown>;
  assertEquals(items.type, 'object');
  assertExists(items.properties);

  const itemProps = items.properties as Record<string, unknown>;
  assertExists(itemProps.hex);
  assertExists(itemProps.name);
  assertExists(itemProps.usage_option);
  assertExists(itemProps.sort_order);
});

// ============================================================================
// Contract Tests - Verify JSON Schema <-> Zod Schema alignment
// ============================================================================

Deno.test('Contract: JSON schema required fields match Zod schema', () => {
  const jsonSchema = colorsJsonSchema.schema as Record<string, unknown>;
  const required = jsonSchema.required as string[];

  assert(required.includes('palette_colors'));

  // Zod should reject if palette_colors is missing
  const result = safeParseColorsResponse({});
  assertEquals(result.success, false);
});

Deno.test('Contract: JSON schema nested structure matches Zod', () => {
  const jsonSchema = colorsJsonSchema.schema as Record<string, unknown>;
  const props = jsonSchema.properties as Record<string, unknown>;
  const paletteColors = props.palette_colors as Record<string, unknown>;
  const items = paletteColors.items as Record<string, unknown>;
  const itemProps = items.properties as Record<string, unknown>;

  const jsonFields = Object.keys(itemProps);

  // Build a sample that matches JSON schema exactly
  const sampleFromJsonSchema = {
    palette_colors: [
      {
        hex: '#1976D2',
        name: 'Test Blue',
        usage_option: 'primary',
        sort_order: 1,
      },
    ],
  };

  // Zod should accept it
  const result = safeParseColorsResponse(sampleFromJsonSchema);
  assertEquals(result.success, true, 'Zod should accept JSON schema conformant data');

  // Verify all JSON schema fields are in Zod output
  if (result.success) {
    const zodFields = Object.keys(result.data.palette_colors[0]);
    for (const field of jsonFields) {
      assert(zodFields.includes(field), `Zod missing field: ${field}`);
    }
  }
});

Deno.test('Contract: additionalProperties=false is enforced', () => {
  const jsonSchema = colorsJsonSchema.schema as Record<string, unknown>;

  assertEquals(jsonSchema.additionalProperties, false);

  // Nested palette color item should also have additionalProperties: false
  const props = jsonSchema.properties as Record<string, unknown>;
  const paletteColors = props.palette_colors as Record<string, unknown>;
  const items = paletteColors.items as Record<string, unknown>;
  assertEquals(items.additionalProperties, false);
});

Deno.test('Contract: OpenAI strict mode requirements met', () => {
  assertEquals(colorsJsonSchema.type, 'json_schema');
  assertEquals(colorsJsonSchema.strict, true);

  const schema = colorsJsonSchema.schema as Record<string, unknown>;
  assertEquals(schema.additionalProperties, false);
});

Deno.test('Contract: usage_option enum values match', () => {
  const jsonSchema = colorsJsonSchema.schema as Record<string, unknown>;
  const props = jsonSchema.properties as Record<string, unknown>;
  const paletteColors = props.palette_colors as Record<string, unknown>;
  const items = paletteColors.items as Record<string, unknown>;
  const itemProps = items.properties as Record<string, unknown>;
  const usageOption = itemProps.usage_option as Record<string, unknown>;

  // JSON Schema should have enum values
  assertExists(usageOption.enum);
  const enumValues = usageOption.enum as string[];

  // Verify key values are present
  assert(enumValues.includes('primary'));
  assert(enumValues.includes('secondary'));
  assert(enumValues.includes('foreground'));
  assert(enumValues.includes('background'));
  assert(enumValues.includes('accent'));
});
