/**
 * Tests for extract-fonts Edge Function schema
 *
 * Run: deno task test
 * Run single: deno test --allow-net --allow-env --allow-read extract-fonts.test.ts
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import {
  safeParseTypographyResponse,
  typographyJsonSchema,
  TypographyStyleItemSchema,
} from '../../../src/app/(scalekit)/style-guide/lib/edge/extract-fonts/schema.ts';

// ============================================================================
// Schema Validation Tests (Unit Tests - No Network)
// ============================================================================

Deno.test('Schema: validates correct typography response', () => {
  const validResponse = {
    typography_styles: [
      {
        typography_style_option_id: '550e8400-e29b-41d4-a716-446655440001',
        font_option_id: '550e8400-e29b-41d4-a716-446655440002',
        font_family: 'Inter',
        font_size_px: 16,
        line_height: 1.5,
        font_weight: '400',
        color: '#333333',
      },
      {
        typography_style_option_id: '550e8400-e29b-41d4-a716-446655440003',
        font_option_id: null,
        font_family: 'Roboto',
        font_size_px: 32,
        line_height: null,
        font_weight: null,
        color: null,
      },
    ],
  };

  const result = safeParseTypographyResponse(validResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.typography_styles.length, 2);
    assertEquals(result.data.typography_styles[0].font_family, 'Inter');
    assertEquals(result.data.typography_styles[1].font_option_id, null);
  }
});

Deno.test('Schema: validates individual typography style item', () => {
  const validItem = {
    typography_style_option_id: '550e8400-e29b-41d4-a716-446655440001',
    font_option_id: '550e8400-e29b-41d4-a716-446655440002',
    font_family: 'Arial',
    font_size_px: 14,
    line_height: 1.6,
    font_weight: 'bold',
    color: '#000000',
  };

  const result = TypographyStyleItemSchema.safeParse(validItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: accepts null for nullable fields', () => {
  const responseWithNulls = {
    typography_styles: [
      {
        typography_style_option_id: '550e8400-e29b-41d4-a716-446655440001',
        font_option_id: null,
        font_family: 'Helvetica',
        font_size_px: 18,
        line_height: null,
        font_weight: null,
        color: null,
      },
    ],
  };

  const result = safeParseTypographyResponse(responseWithNulls);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.typography_styles[0].font_option_id, null);
    assertEquals(result.data.typography_styles[0].line_height, null);
  }
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidResponse = {
    typography_styles: [
      {
        typography_style_option_id: '550e8400-e29b-41d4-a716-446655440001',
        // missing font_family, font_size_px
      },
    ],
  };

  const result = safeParseTypographyResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('typography_styles.0.font_family'));
    assert(fieldErrors.includes('typography_styles.0.font_size_px'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const responseWithExtra = {
    typography_styles: [
      {
        typography_style_option_id: '550e8400-e29b-41d4-a716-446655440001',
        font_option_id: null,
        font_family: 'Inter',
        font_size_px: 16,
        line_height: null,
        font_weight: null,
        color: null,
        extra_field: 'should be rejected',
      },
    ],
  };

  const result = safeParseTypographyResponse(responseWithExtra);

  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
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

Deno.test('Schema: rejects non-integer font_size_px', () => {
  const invalidResponse = {
    typography_styles: [
      {
        typography_style_option_id: '550e8400-e29b-41d4-a716-446655440001',
        font_option_id: null,
        font_family: 'Inter',
        font_size_px: 16.5, // should be integer
        line_height: null,
        font_weight: null,
        color: null,
      },
    ],
  };

  const result = safeParseTypographyResponse(invalidResponse);

  assertEquals(result.success, false);
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: has correct structure for OpenAI', () => {
  assertExists(typographyJsonSchema);
  assertEquals(typographyJsonSchema.type, 'json_schema');
  assertEquals(typographyJsonSchema.name, 'typography_extraction_response');
  assertEquals(typographyJsonSchema.strict, true);
  assertExists(typographyJsonSchema.schema);
});

Deno.test('JSON Schema: schema has required properties', () => {
  const schema = typographyJsonSchema.schema as Record<string, unknown>;

  assertEquals(schema.type, 'object');
  assertExists(schema.properties);
  assertExists(schema.required);

  const props = schema.properties as Record<string, unknown>;
  assertExists(props.typography_styles);
});

Deno.test('JSON Schema: typography_styles array has correct item schema', () => {
  const schema = typographyJsonSchema.schema as Record<string, unknown>;
  const props = schema.properties as Record<string, unknown>;
  const typographyStyles = props.typography_styles as Record<string, unknown>;

  assertEquals(typographyStyles.type, 'array');
  assertExists(typographyStyles.items);

  const items = typographyStyles.items as Record<string, unknown>;
  assertEquals(items.type, 'object');
  assertExists(items.properties);

  const itemProps = items.properties as Record<string, unknown>;
  assertExists(itemProps.typography_style_option_id);
  assertExists(itemProps.font_option_id);
  assertExists(itemProps.font_family);
  assertExists(itemProps.font_size_px);
});

// ============================================================================
// Contract Tests - Verify JSON Schema <-> Zod Schema alignment
// ============================================================================

Deno.test('Contract: JSON schema required fields match Zod schema', () => {
  const jsonSchema = typographyJsonSchema.schema as Record<string, unknown>;
  const required = jsonSchema.required as string[];

  assert(required.includes('typography_styles'));

  // Zod should reject if typography_styles is missing
  const result = safeParseTypographyResponse({});
  assertEquals(result.success, false);
});

Deno.test('Contract: JSON schema nested structure matches Zod', () => {
  const jsonSchema = typographyJsonSchema.schema as Record<string, unknown>;
  const props = jsonSchema.properties as Record<string, unknown>;
  const typographyStyles = props.typography_styles as Record<string, unknown>;
  const items = typographyStyles.items as Record<string, unknown>;
  const itemProps = items.properties as Record<string, unknown>;

  const jsonFields = Object.keys(itemProps);

  // Build a sample that matches JSON schema exactly
  const sampleFromJsonSchema = {
    typography_styles: [
      {
        typography_style_option_id: '550e8400-e29b-41d4-a716-446655440001',
        font_option_id: '550e8400-e29b-41d4-a716-446655440002',
        font_family: 'Test Font',
        font_size_px: 16,
        line_height: 1.5,
        font_weight: '400',
        color: '#000000',
      },
    ],
  };

  // Zod should accept it
  const result = safeParseTypographyResponse(sampleFromJsonSchema);
  assertEquals(result.success, true, 'Zod should accept JSON schema conformant data');

  // Verify all JSON schema fields are in Zod output
  if (result.success) {
    const zodFields = Object.keys(result.data.typography_styles[0]);
    for (const field of jsonFields) {
      assert(zodFields.includes(field), `Zod missing field: ${field}`);
    }
  }
});

Deno.test('Contract: additionalProperties=false is enforced', () => {
  const jsonSchema = typographyJsonSchema.schema as Record<string, unknown>;

  assertEquals(jsonSchema.additionalProperties, false);

  // Nested typography style item should also have additionalProperties: false
  const props = jsonSchema.properties as Record<string, unknown>;
  const typographyStyles = props.typography_styles as Record<string, unknown>;
  const items = typographyStyles.items as Record<string, unknown>;
  assertEquals(items.additionalProperties, false);
});

Deno.test('Contract: OpenAI strict mode requirements met', () => {
  assertEquals(typographyJsonSchema.type, 'json_schema');
  assertEquals(typographyJsonSchema.strict, true);

  const schema = typographyJsonSchema.schema as Record<string, unknown>;
  assertEquals(schema.additionalProperties, false);
});
