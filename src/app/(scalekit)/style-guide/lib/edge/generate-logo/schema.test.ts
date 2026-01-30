/**
 * Co-located tests for generate-logo Edge Function schema
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
 *   deno test --allow-net --allow-env --allow-read src/app/(scalekit)/style-guide/lib/edge/generate-logo/
 */
import { assertEquals, assertExists, assert } from 'jsr:@std/assert@1';
import {
  GeneratedLogoSchema,
  GenerateLogoResponseSchema,
  ImageDataItemSchema,
  OpenAIImagesResponseSchema,
  parseGenerateLogoResponse,
  safeParseOpenAIImagesResponse,
} from './schema.ts';

// Import shared mock generator from testing directory
// Path: generate-logo -> edge -> lib -> style-guide -> (scalekit) -> app -> src -> repo root
import {
  generateMock,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

// ============================================================================
// Schema Validation Tests - GeneratedLogoSchema
// ============================================================================

Deno.test('Schema: validates generated logo mock data', () => {
  const mockLogo = generateMock(GeneratedLogoSchema);
  const result = GeneratedLogoSchema.safeParse(mockLogo);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: validates required fields in GeneratedLogoSchema', () => {
  const validLogo = {
    id: 'logo-123',
    url: 'https://example.com/logo.png',
  };

  const result = GeneratedLogoSchema.safeParse(validLogo);
  assertEquals(result.success, true);
});

Deno.test('Schema: accepts optional revised_prompt in GeneratedLogoSchema', () => {
  const logoWithPrompt = {
    id: 'logo-123',
    url: 'https://example.com/logo.png',
    revised_prompt: 'A modern minimalist logo',
  };

  const result = GeneratedLogoSchema.safeParse(logoWithPrompt);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.revised_prompt, 'A modern minimalist logo');
  }
});

Deno.test('Schema: rejects missing required fields in GeneratedLogoSchema', () => {
  const invalidMock = generateInvalidMock(GeneratedLogoSchema, ['id', 'url']);

  const result = GeneratedLogoSchema.safeParse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('id'));
    assert(fieldErrors.includes('url'));
  }
});

Deno.test('Schema: rejects extra fields in GeneratedLogoSchema (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(GeneratedLogoSchema, {
    extra_field: 'should be rejected',
  });

  const result = GeneratedLogoSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false);
});

// ============================================================================
// Schema Validation Tests - GenerateLogoResponseSchema
// ============================================================================

Deno.test('Schema: validates GenerateLogoResponseSchema mock data', () => {
  const mockResponse = generateMock(GenerateLogoResponseSchema);
  const result = GenerateLogoResponseSchema.safeParse(mockResponse);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: validates logos array in response', () => {
  const validResponse = {
    logos: [
      {
        id: 'logo-1',
        url: 'https://example.com/logo1.png',
      },
      {
        id: 'logo-2',
        url: 'https://example.com/logo2.png',
        revised_prompt: 'A refined logo',
      },
    ],
  };

  const result = GenerateLogoResponseSchema.safeParse(validResponse);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.logos.length, 2);
  }
});

Deno.test('Schema: handles empty logos array', () => {
  const emptyResponse = { logos: [] };
  const result = GenerateLogoResponseSchema.safeParse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.logos.length, 0);
  }
});

Deno.test('Schema: rejects missing logos field', () => {
  const result = GenerateLogoResponseSchema.safeParse({});

  assertEquals(result.success, false);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('logos'));
  }
});

Deno.test('Schema: rejects extra fields in GenerateLogoResponseSchema (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(GenerateLogoResponseSchema, {
    extra_field: 'should be rejected',
  });

  const result = GenerateLogoResponseSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false);
});

// ============================================================================
// Schema Validation Tests - OpenAI Images API Response
// ============================================================================

Deno.test('Schema: validates OpenAI ImageDataItemSchema', () => {
  const mockItem = generateMock(ImageDataItemSchema);
  const result = ImageDataItemSchema.safeParse(mockItem);

  assertEquals(result.success, true);
});

Deno.test('Schema: accepts optional fields in ImageDataItemSchema', () => {
  const itemWithUrl = { url: 'https://example.com/image.png' };
  const itemWithB64 = { b64_json: 'base64encodedstring' };
  const itemWithPrompt = { revised_prompt: 'Enhanced prompt' };

  assertEquals(ImageDataItemSchema.safeParse(itemWithUrl).success, true);
  assertEquals(ImageDataItemSchema.safeParse(itemWithB64).success, true);
  assertEquals(ImageDataItemSchema.safeParse(itemWithPrompt).success, true);
});

Deno.test('Schema: validates OpenAIImagesResponseSchema', () => {
  const mockResponse = generateMock(OpenAIImagesResponseSchema);
  const result = safeParseOpenAIImagesResponse(mockResponse);

  assertEquals(result.success, true);
});

Deno.test('Schema: handles empty data array in OpenAI response', () => {
  const emptyResponse = { data: [] };
  const result = safeParseOpenAIImagesResponse(emptyResponse);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.data.length, 0);
  }
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: GeneratedLogoSchema has expected fields', () => {
  const fields = getSchemaFields(GeneratedLogoSchema);
  assert(fields.includes('id'));
  assert(fields.includes('url'));
  assert(fields.includes('revised_prompt'));
});

Deno.test('Contract: GenerateLogoResponseSchema has expected fields', () => {
  const fields = getSchemaFields(GenerateLogoResponseSchema);
  assert(fields.includes('logos'));
});

Deno.test('Contract: ImageDataItemSchema has expected fields', () => {
  const fields = getSchemaFields(ImageDataItemSchema);
  assert(fields.includes('url'));
  assert(fields.includes('b64_json'));
  assert(fields.includes('revised_prompt'));
});
