/**
 * Tests for suggest-personas-for-customer-id Edge Function schema
 *
 * Run: deno task test
 * Run single: deno test --allow-net --allow-env --allow-read suggest-personas.test.ts
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import {
  safeParsePersonasResponse,
  personasJsonSchema,
  PersonaItemSchema,
} from '../../../src/app/(scalekit)/strategy-forge/lib/edge/suggest-personas-for-customer-id/schema.ts';

// ============================================================================
// Schema Validation Tests (Unit Tests - No Network)
// ============================================================================

Deno.test('Schema: validates correct personas response', () => {
  const validResponse = {
    personas: [
      {
        name: 'Enterprise IT Manager',
        description:
          'Responsible for managing IT infrastructure and ensuring system reliability. Works closely with vendors and internal teams to optimize technology investments.',
      },
      {
        name: 'Small Business Owner',
        description:
          'Runs a growing business and needs efficient tools to manage operations. Values simplicity and cost-effectiveness in technology solutions.',
      },
    ],
  };

  const result = safeParsePersonasResponse(validResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.personas.length, 2);
    assertEquals(result.data.personas[0].name, 'Enterprise IT Manager');
  }
});

Deno.test('Schema: validates individual persona item', () => {
  const validItem = {
    name: 'Marketing Director',
    description:
      'Leads marketing strategy and campaigns. Focuses on brand awareness and lead generation through digital and traditional channels.',
  };

  const result = PersonaItemSchema.safeParse(validItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidResponse = {
    personas: [
      {
        name: 'Test Persona',
        // missing description
      },
    ],
  };

  const result = safeParsePersonasResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('personas.0.description'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const responseWithExtra = {
    personas: [
      {
        name: 'Test Persona',
        description: 'A test persona description.',
        extra_field: 'should be rejected',
      },
    ],
  };

  const result = safeParsePersonasResponse(responseWithExtra);

  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
});

Deno.test('Schema: handles empty personas array', () => {
  const emptyResponse = { personas: [] };

  const result = safeParsePersonasResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.personas.length, 0);
  }
});

Deno.test('Schema: rejects missing personas field', () => {
  const result = safeParsePersonasResponse({});

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('personas'));
  }
});

Deno.test('Schema: rejects non-array personas field', () => {
  const invalidResponse = {
    personas: 'not an array',
  };

  const result = safeParsePersonasResponse(invalidResponse);

  assertEquals(result.success, false);
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: has correct structure for OpenAI', () => {
  assertExists(personasJsonSchema);
  assertEquals(personasJsonSchema.type, 'json_schema');
  assertEquals(personasJsonSchema.name, 'personas_response');
  assertEquals(personasJsonSchema.strict, true);
  assertExists(personasJsonSchema.schema);
});

Deno.test('JSON Schema: schema has required properties', () => {
  const schema = personasJsonSchema.schema as Record<string, unknown>;

  assertEquals(schema.type, 'object');
  assertExists(schema.properties);
  assertExists(schema.required);

  const props = schema.properties as Record<string, unknown>;
  assertExists(props.personas);
});

Deno.test('JSON Schema: personas array has correct item schema', () => {
  const schema = personasJsonSchema.schema as Record<string, unknown>;
  const props = schema.properties as Record<string, unknown>;
  const personas = props.personas as Record<string, unknown>;

  assertEquals(personas.type, 'array');
  assertExists(personas.items);

  const items = personas.items as Record<string, unknown>;
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
  const jsonSchema = personasJsonSchema.schema as Record<string, unknown>;
  const required = jsonSchema.required as string[];

  assert(required.includes('personas'));

  // Zod should reject if personas is missing
  const result = safeParsePersonasResponse({});
  assertEquals(result.success, false);
});

Deno.test('Contract: JSON schema nested structure matches Zod', () => {
  const jsonSchema = personasJsonSchema.schema as Record<string, unknown>;
  const props = jsonSchema.properties as Record<string, unknown>;
  const personas = props.personas as Record<string, unknown>;
  const items = personas.items as Record<string, unknown>;
  const itemProps = items.properties as Record<string, unknown>;

  const jsonFields = Object.keys(itemProps);

  // Build a sample that matches JSON schema exactly
  const sampleFromJsonSchema = {
    personas: [
      {
        name: 'Test Persona',
        description: 'A test persona for contract testing.',
      },
    ],
  };

  // Zod should accept it
  const result = safeParsePersonasResponse(sampleFromJsonSchema);
  assertEquals(result.success, true, 'Zod should accept JSON schema conformant data');

  // Verify all JSON schema fields are in Zod output
  if (result.success) {
    const zodFields = Object.keys(result.data.personas[0]);
    for (const field of jsonFields) {
      assert(zodFields.includes(field), `Zod missing field: ${field}`);
    }
  }
});

Deno.test('Contract: additionalProperties=false is enforced', () => {
  const jsonSchema = personasJsonSchema.schema as Record<string, unknown>;

  assertEquals(jsonSchema.additionalProperties, false);

  // Nested persona item should also have additionalProperties: false
  const props = jsonSchema.properties as Record<string, unknown>;
  const personas = props.personas as Record<string, unknown>;
  const items = personas.items as Record<string, unknown>;
  assertEquals(items.additionalProperties, false);
});

Deno.test('Contract: OpenAI strict mode requirements met', () => {
  assertEquals(personasJsonSchema.type, 'json_schema');
  assertEquals(personasJsonSchema.strict, true);

  const schema = personasJsonSchema.schema as Record<string, unknown>;
  assertEquals(schema.additionalProperties, false);
});
