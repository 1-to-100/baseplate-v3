/**
 * Co-located tests for save-generated-logo Edge Function schema
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
 *   deno test --allow-net --allow-env --allow-read src/app/(scalekit)/style-guide/lib/edge/save-generated-logo/
 */
import { assertEquals, assertExists, assert } from '@std/assert';
import {
  SaveGeneratedLogoRequestSchema,
  PresetLogoSchema,
  SaveGeneratedLogoResponseSchema,
  parseSaveGeneratedLogoRequest,
  safeParseSaveGeneratedLogoRequest,
  safeParseSaveGeneratedLogoResponse,
} from './schema.ts';

// Import shared mock generator from testing directory
// Path: save-generated-logo -> edge -> lib -> style-guide -> (scalekit) -> app -> src -> repo root
import {
  generateMock,
  generateInvalidMock,
  generateMockWithExtra,
  getSchemaFields,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

// ============================================================================
// Schema Validation Tests - SaveGeneratedLogoRequestSchema
// ============================================================================

Deno.test('Schema: validates SaveGeneratedLogoRequestSchema with valid data', () => {
  const validRequest = {
    visual_style_guide_id: '123e4567-e89b-12d3-a456-426614174000',
    logo_url: 'https://example.com/logo.png',
  };
  const result = safeParseSaveGeneratedLogoRequest(validRequest);

  assertEquals(result.success, true, 'Valid request should pass validation');
});

Deno.test('Schema: validates required fields in request', () => {
  const validRequest = {
    visual_style_guide_id: '123e4567-e89b-12d3-a456-426614174000',
    logo_url: 'https://example.com/logo.png',
  };

  const result = safeParseSaveGeneratedLogoRequest(validRequest);
  assertEquals(result.success, true);
});

Deno.test('Schema: accepts optional logo_type_option_id', () => {
  const requestWithTypeId = {
    visual_style_guide_id: '123e4567-e89b-12d3-a456-426614174000',
    logo_url: 'https://example.com/logo.png',
    logo_type_option_id: '123e4567-e89b-12d3-a456-426614174001',
  };

  const result = safeParseSaveGeneratedLogoRequest(requestWithTypeId);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.logo_type_option_id, '123e4567-e89b-12d3-a456-426614174001');
  }
});

Deno.test('Schema: accepts optional logo_type_option_ids array', () => {
  const requestWithTypeIds = {
    visual_style_guide_id: '123e4567-e89b-12d3-a456-426614174000',
    logo_url: 'https://example.com/logo.png',
    logo_type_option_ids: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ],
  };

  const result = safeParseSaveGeneratedLogoRequest(requestWithTypeIds);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.logo_type_option_ids?.length, 2);
  }
});

Deno.test('Schema: accepts optional all_logo_urls array', () => {
  const requestWithAllUrls = {
    visual_style_guide_id: '123e4567-e89b-12d3-a456-426614174000',
    logo_url: 'https://example.com/logo.png',
    all_logo_urls: ['https://example.com/logo1.png', 'https://example.com/logo2.png'],
  };

  const result = safeParseSaveGeneratedLogoRequest(requestWithAllUrls);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.all_logo_urls?.length, 2);
  }
});

Deno.test('Schema: rejects missing required fields in request', () => {
  const invalidMock = generateInvalidMock(SaveGeneratedLogoRequestSchema, [
    'visual_style_guide_id',
    'logo_url',
  ]);

  const result = safeParseSaveGeneratedLogoRequest(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('visual_style_guide_id'));
    assert(fieldErrors.includes('logo_url'));
  }
});

Deno.test('Schema: rejects invalid UUID for visual_style_guide_id', () => {
  const invalidRequest = {
    visual_style_guide_id: 'not-a-uuid',
    logo_url: 'https://example.com/logo.png',
  };

  const result = safeParseSaveGeneratedLogoRequest(invalidRequest);
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects invalid URL for logo_url', () => {
  const invalidRequest = {
    visual_style_guide_id: '123e4567-e89b-12d3-a456-426614174000',
    logo_url: 'not-a-url',
  };

  const result = safeParseSaveGeneratedLogoRequest(invalidRequest);
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects extra fields in request (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(SaveGeneratedLogoRequestSchema, {
    extra_field: 'should be rejected',
  });

  const result = safeParseSaveGeneratedLogoRequest(mockWithExtra);
  assertEquals(result.success, false);
});

// ============================================================================
// Schema Validation Tests - PresetLogoSchema
// ============================================================================

Deno.test('Schema: validates PresetLogoSchema mock data', () => {
  const mockPreset = generateMock(PresetLogoSchema);
  const result = PresetLogoSchema.safeParse(mockPreset);

  assertEquals(result.success, true, 'Generated mock should always validate');
});

Deno.test('Schema: validates required fields in PresetLogoSchema', () => {
  const validPreset = {
    id: 'preset-123',
    url: 'https://example.com/preset.png',
    storage_path: 'logos/preset-123.png',
  };

  const result = PresetLogoSchema.safeParse(validPreset);
  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing required fields in PresetLogoSchema', () => {
  const invalidMock = generateInvalidMock(PresetLogoSchema, ['id', 'url', 'storage_path']);

  const result = PresetLogoSchema.safeParse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('id'));
    assert(fieldErrors.includes('url'));
    assert(fieldErrors.includes('storage_path'));
  }
});

Deno.test('Schema: rejects invalid URL in PresetLogoSchema', () => {
  const invalidPreset = {
    id: 'preset-123',
    url: 'not-a-url',
    storage_path: 'logos/preset-123.png',
  };

  const result = PresetLogoSchema.safeParse(invalidPreset);
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects extra fields in PresetLogoSchema (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(PresetLogoSchema, {
    extra_field: 'should be rejected',
  });

  const result = PresetLogoSchema.safeParse(mockWithExtra);
  assertEquals(result.success, false);
});

// ============================================================================
// Schema Validation Tests - SaveGeneratedLogoResponseSchema
// ============================================================================

Deno.test('Schema: validates SaveGeneratedLogoResponseSchema with valid data', () => {
  const validResponse = {
    storage_path: 'logos/logo-123.png',
    signed_url: 'https://example.com/signed/logo-123.png',
    logo_asset_id: '123e4567-e89b-12d3-a456-426614174000',
  };
  const result = safeParseSaveGeneratedLogoResponse(validResponse);

  assertEquals(result.success, true, 'Valid response should pass validation');
});

Deno.test('Schema: validates required fields in response', () => {
  const validResponse = {
    storage_path: 'logos/logo-123.png',
    signed_url: 'https://example.com/signed/logo-123.png',
    logo_asset_id: '123e4567-e89b-12d3-a456-426614174000',
  };

  const result = safeParseSaveGeneratedLogoResponse(validResponse);
  assertEquals(result.success, true);
});

Deno.test('Schema: accepts optional preset_logos array', () => {
  const responseWithPresets = {
    storage_path: 'logos/logo-123.png',
    signed_url: 'https://example.com/signed/logo-123.png',
    logo_asset_id: '123e4567-e89b-12d3-a456-426614174000',
    preset_logos: [
      {
        id: 'preset-1',
        url: 'https://example.com/preset1.png',
        storage_path: 'logos/preset-1.png',
      },
      {
        id: 'preset-2',
        url: 'https://example.com/preset2.png',
        storage_path: 'logos/preset-2.png',
      },
    ],
  };

  const result = safeParseSaveGeneratedLogoResponse(responseWithPresets);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.preset_logos?.length, 2);
  }
});

Deno.test('Schema: handles empty preset_logos array', () => {
  const responseWithEmptyPresets = {
    storage_path: 'logos/logo-123.png',
    signed_url: 'https://example.com/signed/logo-123.png',
    logo_asset_id: '123e4567-e89b-12d3-a456-426614174000',
    preset_logos: [],
  };

  const result = safeParseSaveGeneratedLogoResponse(responseWithEmptyPresets);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.preset_logos?.length, 0);
  }
});

Deno.test('Schema: rejects missing required fields in response', () => {
  const invalidMock = generateInvalidMock(SaveGeneratedLogoResponseSchema, [
    'storage_path',
    'signed_url',
    'logo_asset_id',
  ]);

  const result = safeParseSaveGeneratedLogoResponse(invalidMock);
  assertEquals(result.success, false);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((i) => i.path.join('.'));
    assert(fieldErrors.includes('storage_path'));
    assert(fieldErrors.includes('signed_url'));
    assert(fieldErrors.includes('logo_asset_id'));
  }
});

Deno.test('Schema: rejects invalid UUID for logo_asset_id', () => {
  const invalidResponse = {
    storage_path: 'logos/logo-123.png',
    signed_url: 'https://example.com/signed/logo-123.png',
    logo_asset_id: 'not-a-uuid',
  };

  const result = safeParseSaveGeneratedLogoResponse(invalidResponse);
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects invalid URL for signed_url', () => {
  const invalidResponse = {
    storage_path: 'logos/logo-123.png',
    signed_url: 'not-a-url',
    logo_asset_id: '123e4567-e89b-12d3-a456-426614174000',
  };

  const result = safeParseSaveGeneratedLogoResponse(invalidResponse);
  assertEquals(result.success, false);
});

Deno.test('Schema: rejects extra fields in response (strict mode)', () => {
  const mockWithExtra = generateMockWithExtra(SaveGeneratedLogoResponseSchema, {
    extra_field: 'should be rejected',
  });

  const result = safeParseSaveGeneratedLogoResponse(mockWithExtra);
  assertEquals(result.success, false);
});

// ============================================================================
// Contract Tests - Schema has expected fields
// ============================================================================

Deno.test('Contract: SaveGeneratedLogoRequestSchema has expected fields', () => {
  const fields = getSchemaFields(SaveGeneratedLogoRequestSchema);
  assert(fields.includes('visual_style_guide_id'));
  assert(fields.includes('logo_url'));
  assert(fields.includes('logo_type_option_id'));
  assert(fields.includes('logo_type_option_ids'));
  assert(fields.includes('all_logo_urls'));
});

Deno.test('Contract: PresetLogoSchema has expected fields', () => {
  const fields = getSchemaFields(PresetLogoSchema);
  assert(fields.includes('id'));
  assert(fields.includes('url'));
  assert(fields.includes('storage_path'));
});

Deno.test('Contract: SaveGeneratedLogoResponseSchema has expected fields', () => {
  const fields = getSchemaFields(SaveGeneratedLogoResponseSchema);
  assert(fields.includes('storage_path'));
  assert(fields.includes('signed_url'));
  assert(fields.includes('logo_asset_id'));
  assert(fields.includes('preset_logos'));
});
