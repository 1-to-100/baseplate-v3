/**
 * Integration tests for get-competitor-list-for-customer-id Edge Function
 *
 * Uses the same Zod schema that defines the OpenAI response format
 * to validate actual API responses.
 *
 * Run: deno task test
 * Run single: deno test --allow-net --allow-env --allow-read get-competitor-list.test.ts
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert';
import {
  CompetitorsResponseSchema,
  safeParseCompetitorsResponse,
  competitorsJsonSchema,
} from '../../../src/app/(scalekit)/strategy-forge/lib/edge/get-competitor-list-for-customer-id/schema.ts';

// ============================================================================
// Schema Validation Tests (Unit Tests - No Network)
// ============================================================================

Deno.test('Schema: validates correct response', () => {
  const validResponse = {
    competitors: [
      {
        name: 'Acme Corp',
        website_url: 'https://acme.com',
        description: 'A leading provider of enterprise solutions.',
      },
      {
        name: 'Beta Inc',
        website_url: 'https://beta.io',
        description: 'Innovative startup disrupting the market.',
      },
    ],
  };

  const result = safeParseCompetitorsResponse(validResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.competitors.length, 2);
    assertEquals(result.data.competitors[0].name, 'Acme Corp');
  }
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidResponse = {
    competitors: [
      {
        name: 'Acme Corp',
        // missing website_url and description
      },
    ],
  };

  const result = safeParseCompetitorsResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('competitors.0.website_url'));
    assert(fieldErrors.includes('competitors.0.description'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const responseWithExtra = {
    competitors: [
      {
        name: 'Acme Corp',
        website_url: 'https://acme.com',
        description: 'Description here.',
        extra_field: 'should be rejected',
      },
    ],
  };

  const result = safeParseCompetitorsResponse(responseWithExtra);
  // With .strict(), Zod rejects extra fields - matching OpenAI strict mode behavior
  assertEquals(result.success, false);
  if (!result.success) {
    const hasUnrecognizedKeyError = result.error.issues.some(
      (i) => i.code === 'unrecognized_keys'
    );
    assert(hasUnrecognizedKeyError, 'Should have unrecognized_keys error');
  }
});

Deno.test('Schema: handles empty competitors array', () => {
  const emptyResponse = { competitors: [] };

  const result = safeParseCompetitorsResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.competitors.length, 0);
  }
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: has correct structure for OpenAI', () => {
  assertExists(competitorsJsonSchema);
  assertEquals(competitorsJsonSchema.type, 'json_schema');
  assertEquals(competitorsJsonSchema.name, 'competitors_response');
  assertEquals(competitorsJsonSchema.strict, true);
  assertExists(competitorsJsonSchema.schema);
});

Deno.test('JSON Schema: schema has required properties', () => {
  const schema = competitorsJsonSchema.schema as Record<string, unknown>;

  assertEquals(schema.type, 'object');
  assertExists(schema.properties);
  assertExists(schema.required);

  const props = schema.properties as Record<string, unknown>;
  assertExists(props.competitors);
});

// ============================================================================
// Contract Tests - Verify JSON Schema ↔ Zod Schema alignment
// ============================================================================

Deno.test('Contract: JSON schema required fields match Zod schema', () => {
  const jsonSchema = competitorsJsonSchema.schema as Record<string, unknown>;
  const required = jsonSchema.required as string[];

  // The JSON schema we send to OpenAI requires 'competitors'
  assert(required.includes('competitors'));

  // Zod should reject if competitors is missing
  const result = safeParseCompetitorsResponse({});
  assertEquals(result.success, false);
});

Deno.test('Contract: JSON schema nested structure matches Zod', () => {
  const jsonSchema = competitorsJsonSchema.schema as Record<string, unknown>;
  const props = jsonSchema.properties as Record<string, unknown>;
  const competitors = props.competitors as Record<string, unknown>;
  const items = competitors.items as Record<string, unknown>;
  const itemProps = items.properties as Record<string, unknown>;

  // JSON schema defines these fields
  const jsonFields = Object.keys(itemProps);

  // Build a sample that matches JSON schema exactly
  const sampleFromJsonSchema = {
    competitors: [
      {
        name: 'Test',
        website_url: 'https://test.com',
        description: 'A test company',
      },
    ],
  };

  // Zod should accept it
  const result = safeParseCompetitorsResponse(sampleFromJsonSchema);
  assertEquals(result.success, true, 'Zod should accept JSON schema conformant data');

  // Verify all JSON schema fields are in Zod output
  if (result.success) {
    const zodFields = Object.keys(result.data.competitors[0]);
    for (const field of jsonFields) {
      assert(zodFields.includes(field), `Zod missing field: ${field}`);
    }
  }
});

Deno.test('Contract: additionalProperties=false is enforced', () => {
  const jsonSchema = competitorsJsonSchema.schema as Record<string, unknown>;

  // JSON schema should have additionalProperties: false
  assertEquals(jsonSchema.additionalProperties, false);

  // Zod .strict() rejects extra fields (matches OpenAI strict mode behavior)
  const withExtra = {
    competitors: [
      {
        name: 'Test',
        website_url: 'https://test.com',
        description: 'Desc',
        extra: 'should be rejected',
      },
    ],
  };

  const result = safeParseCompetitorsResponse(withExtra);
  assertEquals(result.success, false, 'Zod strict mode should reject extra fields');
});

Deno.test('Contract: OpenAI strict mode requirements met', () => {
  // OpenAI strict mode requires:
  // 1. type: 'json_schema'
  // 2. strict: true
  // 3. All objects have additionalProperties: false
  // 4. All properties in required array

  assertEquals(competitorsJsonSchema.type, 'json_schema');
  assertEquals(competitorsJsonSchema.strict, true);

  const schema = competitorsJsonSchema.schema as Record<string, unknown>;
  assertEquals(schema.additionalProperties, false);

  // Check nested object also has additionalProperties: false
  const props = schema.properties as Record<string, unknown>;
  const competitors = props.competitors as Record<string, unknown>;
  const items = competitors.items as Record<string, unknown>;
  assertEquals(items.additionalProperties, false);
});

// ============================================================================
// Integration Tests (Requires deployed function + auth)
// ============================================================================

Deno.test({
  name: 'Integration: get-competitor-list returns valid schema',
  ignore: !Deno.env.get('TEST_AUTH_TOKEN'), // Skip if no auth token
  async fn() {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const TEST_AUTH_TOKEN = Deno.env.get('TEST_AUTH_TOKEN');
    const TEST_CUSTOMER_ID = Deno.env.get('TEST_CUSTOMER_ID');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_AUTH_TOKEN || !TEST_CUSTOMER_ID) {
      console.log('Skipping: Missing required env vars');
      return;
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/get-competitor-list-for-customer-id`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
          'apikey': SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ customer_id: TEST_CUSTOMER_ID, limit: 3 }),
      }
    );

    assertEquals(response.ok, true, `HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    assertExists(data.competitors, 'Response should have competitors array');

    // Validate using the same schema that defines the OpenAI response format
    // If this passes, all fields are guaranteed valid - no need for redundant checks
    const result = safeParseCompetitorsResponse({ competitors: data.competitors });

    assert(result.success, `Schema validation failed: ${JSON.stringify(result)}`);

    // Optional: business logic validation beyond schema (e.g., URL format)
    if (result.success) {
      for (const competitor of result.data.competitors) {
        assert(
          competitor.website_url.startsWith('https://'),
          `website_url should start with https://: ${competitor.website_url}`
        );
      }
    }
  },
});
