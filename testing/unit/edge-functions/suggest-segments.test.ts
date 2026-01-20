/**
 * Tests for suggest-segments-for-customer-id Edge Function schema
 *
 * Run: deno task test
 * Run single: deno test --allow-net --allow-env --allow-read suggest-segments.test.ts
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import {
  safeParseSegmentsResponse,
  segmentsJsonSchema,
  SegmentItemSchema,
} from '../../../src/app/(scalekit)/strategy-forge/lib/edge/suggest-segments-for-customer-id/schema.ts';

// ============================================================================
// Schema Validation Tests (Unit Tests - No Network)
// ============================================================================

Deno.test('Schema: validates correct segments response', () => {
  const validResponse = {
    segments: [
      {
        name: 'Enterprise',
        description:
          'Large organizations with 1000+ employees seeking comprehensive solutions. They have dedicated IT teams and complex procurement processes.',
      },
      {
        name: 'Small Business',
        description:
          'Companies with 10-100 employees looking for affordable, easy-to-use tools. They value simplicity and quick implementation.',
      },
    ],
  };

  const result = safeParseSegmentsResponse(validResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.segments.length, 2);
    assertEquals(result.data.segments[0].name, 'Enterprise');
  }
});

Deno.test('Schema: validates individual segment item', () => {
  const validItem = {
    name: 'Mid-Market',
    description:
      'Companies with 100-1000 employees. Growing rapidly and need scalable solutions that can adapt to changing needs.',
  };

  const result = SegmentItemSchema.safeParse(validItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidResponse = {
    segments: [
      {
        name: 'Test Segment',
        // missing description
      },
    ],
  };

  const result = safeParseSegmentsResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('segments.0.description'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const responseWithExtra = {
    segments: [
      {
        name: 'Test Segment',
        description: 'A test segment description.',
        extra_field: 'should be rejected',
      },
    ],
  };

  const result = safeParseSegmentsResponse(responseWithExtra);

  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
});

Deno.test('Schema: handles empty segments array', () => {
  const emptyResponse = { segments: [] };

  const result = safeParseSegmentsResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.segments.length, 0);
  }
});

Deno.test('Schema: rejects missing segments field', () => {
  const result = safeParseSegmentsResponse({});

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('segments'));
  }
});

Deno.test('Schema: rejects non-array segments field', () => {
  const invalidResponse = {
    segments: 'not an array',
  };

  const result = safeParseSegmentsResponse(invalidResponse);

  assertEquals(result.success, false);
});

Deno.test('Schema: rejects extra fields at root level', () => {
  const responseWithRootExtra = {
    segments: [],
    extra_root_field: 'should be rejected',
  };

  const result = safeParseSegmentsResponse(responseWithRootExtra);

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
  assertExists(segmentsJsonSchema);
  assertEquals(segmentsJsonSchema.type, 'json_schema');
  assertEquals(segmentsJsonSchema.name, 'segments_response');
  assertEquals(segmentsJsonSchema.strict, true);
  assertExists(segmentsJsonSchema.schema);
});

Deno.test('JSON Schema: schema has required properties', () => {
  const schema = segmentsJsonSchema.schema as Record<string, unknown>;

  assertEquals(schema.type, 'object');
  assertExists(schema.properties);
  assertExists(schema.required);

  const props = schema.properties as Record<string, unknown>;
  assertExists(props.segments);
});

Deno.test('JSON Schema: segments array has correct item schema', () => {
  const schema = segmentsJsonSchema.schema as Record<string, unknown>;
  const props = schema.properties as Record<string, unknown>;
  const segments = props.segments as Record<string, unknown>;

  assertEquals(segments.type, 'array');
  assertExists(segments.items);

  const items = segments.items as Record<string, unknown>;
  assertEquals(items.type, 'object');
  assertExists(items.properties);

  const itemProps = items.properties as Record<string, unknown>;
  assertExists(itemProps.name);
  assertExists(itemProps.description);
});

// ============================================================================
// Contract Tests - Verify JSON Schema <-> Zod Schema alignment
// ============================================================================

Deno.test('Contract: JSON schema required fields match Zod schema', () => {
  const jsonSchema = segmentsJsonSchema.schema as Record<string, unknown>;
  const required = jsonSchema.required as string[];

  assert(required.includes('segments'));

  // Zod should reject if segments is missing
  const result = safeParseSegmentsResponse({});
  assertEquals(result.success, false);
});

Deno.test('Contract: JSON schema nested structure matches Zod', () => {
  const jsonSchema = segmentsJsonSchema.schema as Record<string, unknown>;
  const props = jsonSchema.properties as Record<string, unknown>;
  const segments = props.segments as Record<string, unknown>;
  const items = segments.items as Record<string, unknown>;
  const itemProps = items.properties as Record<string, unknown>;

  const jsonFields = Object.keys(itemProps);

  // Build a sample that matches JSON schema exactly
  const sampleFromJsonSchema = {
    segments: [
      {
        name: 'Test Segment',
        description: 'A test segment for contract testing purposes.',
      },
    ],
  };

  // Zod should accept it
  const result = safeParseSegmentsResponse(sampleFromJsonSchema);
  assertEquals(result.success, true, 'Zod should accept JSON schema conformant data');

  // Verify all JSON schema fields are in Zod output
  if (result.success) {
    const zodFields = Object.keys(result.data.segments[0]);
    for (const field of jsonFields) {
      assert(zodFields.includes(field), `Zod missing field: ${field}`);
    }
  }
});

Deno.test('Contract: additionalProperties=false is enforced', () => {
  const jsonSchema = segmentsJsonSchema.schema as Record<string, unknown>;

  assertEquals(jsonSchema.additionalProperties, false);

  // Nested segment item should also have additionalProperties: false
  const props = jsonSchema.properties as Record<string, unknown>;
  const segments = props.segments as Record<string, unknown>;
  const items = segments.items as Record<string, unknown>;
  assertEquals(items.additionalProperties, false);
});

Deno.test('Contract: OpenAI strict mode requirements met', () => {
  assertEquals(segmentsJsonSchema.type, 'json_schema');
  assertEquals(segmentsJsonSchema.strict, true);

  const schema = segmentsJsonSchema.schema as Record<string, unknown>;
  assertEquals(schema.additionalProperties, false);
});
