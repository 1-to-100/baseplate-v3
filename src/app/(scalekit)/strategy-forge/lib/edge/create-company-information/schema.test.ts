/**
 * Co-located tests for create-company-information Edge Function schema
 *
 * Run from this directory: deno task test
 */
import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1';
import {
  GeneratedCompanyInfoSchema,
  companyInfoJsonSchema,
  safeParseGeneratedCompanyInfo,
} from './schema.ts';
import {
  generateInvalidMock,
  generateMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

// ============================================================================
// Schema Validation Tests
// ============================================================================

Deno.test('Schema: validates generated mock data', () => {
  const mockResponse = generateMock(GeneratedCompanyInfoSchema);
  const result = safeParseGeneratedCompanyInfo(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: allows content_authoring_prompt to be null', () => {
  const mockResponse = generateMock(GeneratedCompanyInfoSchema);
  const withNullPrompt = { ...mockResponse, content_authoring_prompt: null };

  const result = safeParseGeneratedCompanyInfo(withNullPrompt);
  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(GeneratedCompanyInfoSchema, [
    'tagline',
    'problem_overview',
    'competitive_overview',
  ]);
  const result = safeParseGeneratedCompanyInfo(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('tagline'));
    assert(fieldErrors.includes('problem_overview'));
    assert(fieldErrors.includes('competitive_overview'));
  }
});

Deno.test('Schema: rejects extra fields (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(GeneratedCompanyInfoSchema, {
    unsupported_field: 'should be rejected',
  });
  const result = safeParseGeneratedCompanyInfo(mockWithExtra);
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects wrong field types', () => {
  const mockResponse = generateMock(GeneratedCompanyInfoSchema);
  const invalidResponse = {
    ...mockResponse,
    competitive_overview: 12345,
  };
  const result = safeParseGeneratedCompanyInfo(invalidResponse);
  assertEquals(result.success, false);
});

// ============================================================================
// JSON Schema Export Tests
// ============================================================================

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(companyInfoJsonSchema);
  assertExists(companyInfoJsonSchema.schema);
  assertEquals(companyInfoJsonSchema.type, 'json_schema');
  assertEquals(companyInfoJsonSchema.strict, true);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: schema has expected fields', () => {
  const zodFields = getSchemaFields(GeneratedCompanyInfoSchema);
  assert(zodFields.includes('tagline'));
  assert(zodFields.includes('one_sentence_summary'));
  assert(zodFields.includes('problem_overview'));
  assert(zodFields.includes('solution_overview'));
  assert(zodFields.includes('competitive_overview'));
  assert(zodFields.includes('content_authoring_prompt'));
});
