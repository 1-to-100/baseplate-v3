/**
 * Tests for extract-logos Edge Function schema
 *
 * Run: deno task test
 * Run single: deno test --allow-net --allow-env --allow-read extract-logos.test.ts
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import {
  safeParseLogosResponse,
  logosJsonSchema,
  LogoAssetItemSchema,
} from '../../../src/app/(scalekit)/style-guide/lib/edge/extract-logos/schema.ts';

// ============================================================================
// Schema Validation Tests (Unit Tests - No Network)
// ============================================================================

Deno.test('Schema: validates correct logos response', () => {
  const validResponse = {
    logo_assets: [
      {
        logo_type_option_id: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Full color primary logo used in header',
        file_url: 'https://example.com/logo.svg',
      },
      {
        logo_type_option_id: '550e8400-e29b-41d4-a716-446655440002',
        description: 'White monochrome logo for dark backgrounds',
        file_url: null,
      },
    ],
  };

  const result = safeParseLogosResponse(validResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.logo_assets.length, 2);
    assertEquals(result.data.logo_assets[0].file_url, 'https://example.com/logo.svg');
    assertEquals(result.data.logo_assets[1].file_url, null);
  }
});

Deno.test('Schema: validates individual logo asset item', () => {
  const validItem = {
    logo_type_option_id: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Favicon logo used in browser tab',
    file_url: 'https://example.com/favicon.png',
  };

  const result = LogoAssetItemSchema.safeParse(validItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: accepts null for nullable fields', () => {
  const responseWithNulls = {
    logo_assets: [
      {
        logo_type_option_id: '550e8400-e29b-41d4-a716-446655440001',
        description: null,
        file_url: null,
      },
    ],
  };

  const result = safeParseLogosResponse(responseWithNulls);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.logo_assets[0].description, null);
    assertEquals(result.data.logo_assets[0].file_url, null);
  }
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidResponse = {
    logo_assets: [
      {
        // missing logo_type_option_id
        description: 'A logo',
        file_url: 'https://example.com/logo.png',
      },
    ],
  };

  const result = safeParseLogosResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('logo_assets.0.logo_type_option_id'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const responseWithExtra = {
    logo_assets: [
      {
        logo_type_option_id: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Logo description',
        file_url: 'https://example.com/logo.svg',
        extra_field: 'should be rejected',
      },
    ],
  };

  const result = safeParseLogosResponse(responseWithExtra);

  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
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
  const invalidResponse = {
    logo_assets: 'not an array',
  };

  const result = safeParseLogosResponse(invalidResponse);

  assertEquals(result.success, false);
});

Deno.test('Schema: rejects extra fields at root level', () => {
  const responseWithRootExtra = {
    logo_assets: [],
    extra_root_field: 'should be rejected',
  };

  const result = safeParseLogosResponse(responseWithRootExtra);

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
  assertExists(logosJsonSchema);
  assertEquals(logosJsonSchema.type, 'json_schema');
  assertEquals(logosJsonSchema.name, 'logo_extraction_response');
  assertEquals(logosJsonSchema.strict, true);
  assertExists(logosJsonSchema.schema);
});

Deno.test('JSON Schema: schema has required properties', () => {
  const schema = logosJsonSchema.schema as Record<string, unknown>;

  assertEquals(schema.type, 'object');
  assertExists(schema.properties);
  assertExists(schema.required);

  const props = schema.properties as Record<string, unknown>;
  assertExists(props.logo_assets);
});

Deno.test('JSON Schema: logo_assets array has correct item schema', () => {
  const schema = logosJsonSchema.schema as Record<string, unknown>;
  const props = schema.properties as Record<string, unknown>;
  const logoAssets = props.logo_assets as Record<string, unknown>;

  assertEquals(logoAssets.type, 'array');
  assertExists(logoAssets.items);

  const items = logoAssets.items as Record<string, unknown>;
  assertEquals(items.type, 'object');
  assertExists(items.properties);

  const itemProps = items.properties as Record<string, unknown>;
  assertExists(itemProps.logo_type_option_id);
  assertExists(itemProps.description);
  assertExists(itemProps.file_url);
});

// ============================================================================
// Contract Tests - Verify JSON Schema <-> Zod Schema alignment
// ============================================================================

Deno.test('Contract: JSON schema required fields match Zod schema', () => {
  const jsonSchema = logosJsonSchema.schema as Record<string, unknown>;
  const required = jsonSchema.required as string[];

  assert(required.includes('logo_assets'));

  // Zod should reject if logo_assets is missing
  const result = safeParseLogosResponse({});
  assertEquals(result.success, false);
});

Deno.test('Contract: JSON schema nested structure matches Zod', () => {
  const jsonSchema = logosJsonSchema.schema as Record<string, unknown>;
  const props = jsonSchema.properties as Record<string, unknown>;
  const logoAssets = props.logo_assets as Record<string, unknown>;
  const items = logoAssets.items as Record<string, unknown>;
  const itemProps = items.properties as Record<string, unknown>;

  const jsonFields = Object.keys(itemProps);

  // Build a sample that matches JSON schema exactly
  const sampleFromJsonSchema = {
    logo_assets: [
      {
        logo_type_option_id: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Test logo description',
        file_url: 'https://example.com/logo.svg',
      },
    ],
  };

  // Zod should accept it
  const result = safeParseLogosResponse(sampleFromJsonSchema);
  assertEquals(result.success, true, 'Zod should accept JSON schema conformant data');

  // Verify all JSON schema fields are in Zod output
  if (result.success) {
    const zodFields = Object.keys(result.data.logo_assets[0]);
    for (const field of jsonFields) {
      assert(zodFields.includes(field), `Zod missing field: ${field}`);
    }
  }
});

Deno.test('Contract: additionalProperties=false is enforced', () => {
  const jsonSchema = logosJsonSchema.schema as Record<string, unknown>;

  assertEquals(jsonSchema.additionalProperties, false);

  // Nested logo asset item should also have additionalProperties: false
  const props = jsonSchema.properties as Record<string, unknown>;
  const logoAssets = props.logo_assets as Record<string, unknown>;
  const items = logoAssets.items as Record<string, unknown>;
  assertEquals(items.additionalProperties, false);
});

Deno.test('Contract: OpenAI strict mode requirements met', () => {
  assertEquals(logosJsonSchema.type, 'json_schema');
  assertEquals(logosJsonSchema.strict, true);

  const schema = logosJsonSchema.schema as Record<string, unknown>;
  assertEquals(schema.additionalProperties, false);
});
