# Edge Function Test Utilities

Shared testing utilities for Supabase Edge Functions using Deno.

## Overview

This directory contains shared testing utilities and tests for Supabase Edge Functions. Schema tests are **co-located** with their edge functions, while shared utility tests live here.

## Directory Structure

```
deno.json                              # Root config with shared dependencies and test task
testing/unit/edge-functions/
├── llm/                               # LLM Provider Adapter tests
│   ├── adapters.test.ts               # Adapter singleton and initialization tests
│   ├── credentials.test.ts            # Credential validation tests
│   ├── errors.test.ts                 # Error mapping and normalization tests
│   ├── logging.test.ts                # Structured logging tests
│   └── testing.test.ts                # Test utility tests
├── mock-generator.ts                  # Schema-driven mock data generator
├── mock-generator.test.ts             # Tests for the mock generator
└── README.md                          # This file

src/app/(scalekit)/<app>/lib/edge/<function>/
├── index.ts                           # Edge function entry point
├── schema.ts                          # Zod schemas + JSON schema export
└── schema.test.ts                     # Co-located tests

supabase/functions/_shared/llm/        # LLM Provider Adapter source
├── adapters/                          # Provider adapters (OpenAI, Anthropic, Gemini)
├── credentials.ts                     # Credential management
├── errors.ts                          # Error normalization
├── logging.ts                         # Structured logging
├── testing.ts                         # Test utilities (reset functions)
├── types.ts                           # Type definitions
└── index.ts                           # Public API
```

## Running Tests

### Run all edge function tests

From the repository root:

```bash
deno task test:edge
```

This single command runs:
- All co-located schema tests (`src/**/edge/**/*.test.ts`)
- LLM Provider Adapter tests (`testing/unit/edge-functions/llm/*.test.ts`)
- Mock generator utility tests (`testing/unit/edge-functions/*.test.ts`)

## Mock Generator

Use the mock generator to create valid test data from Zod schemas:

```typescript
import {
  generateMock,
  generateMockArray,
  generateInvalidMock,
  generateMockWithExtra,
} from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';
import { ColorsResponseSchema, PaletteColorItemSchema } from './schema.ts';

// Generate valid mock data
const validResponse = generateMock(ColorsResponseSchema);

// Generate array of mocks
const mocks = generateMockArray(PaletteColorItemSchema, 5);

// Generate invalid mock for rejection testing
const invalidMock = generateInvalidMock(PaletteColorItemSchema, ['name']);

// Generate mock with extra fields for strict mode testing
const mockWithExtra = generateMockWithExtra(PaletteColorItemSchema, {
  extra_field: 'should be rejected',
});
```

### Import Path from Co-located Tests

From an edge function directory (e.g., `src/app/(scalekit)/style-guide/lib/edge/extract-colors/`), the mock generator is 7 directory levels up:

```typescript
import { generateMock } from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';
```

## Test Categories

All edge function tests follow these categories:

### 1. Schema Validation Tests

Tests that verify Zod schemas correctly validate data structures:

- **Valid response handling** - Ensures correctly structured data passes validation
- **Required field enforcement** - Verifies missing required fields are rejected
- **Strict mode enforcement** - Confirms extra/unknown fields are rejected
- **Type validation** - Wrong types are rejected (strings for numbers, etc.)
- **Edge cases** - Empty arrays, null values, boundary conditions

### 2. JSON Schema Export Tests

Tests that verify the generated JSON Schema exists for OpenAI's `response_format`.

### 3. Contract Tests

Tests that verify schemas have expected fields:

- **Field existence** - Required fields are present in the schema

## Adding New Tests

When adding tests for a new Edge Function:

1. Create `schema.test.ts` in the edge function directory alongside `schema.ts`
2. Import the schema and mock generator
3. Add tests for each category (schema, JSON export, contract)

Example:

```typescript
import { assertEquals, assertExists, assert } from '@std/assert';
import { MyResponseSchema, safeParseMyResponse, myJsonSchema } from './schema.ts';
import { generateMock, generateInvalidMock, getSchemaFields } from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

Deno.test('Schema: validates generated mock data', () => {
  const mock = generateMock(MyResponseSchema);
  const result = safeParseMyResponse(mock);
  assertEquals(result.success, true);
});

Deno.test('Schema: rejects missing required fields', () => {
  const invalidMock = generateInvalidMock(MyResponseSchema, ['required_field']);
  const result = safeParseMyResponse(invalidMock);
  assertEquals(result.success, false);
});

Deno.test('JSON Schema: exports valid schema for OpenAI', () => {
  assertExists(myJsonSchema);
  assertExists(myJsonSchema.schema);
});

Deno.test('Contract: schema has expected fields', () => {
  const fields = getSchemaFields(MyResponseSchema);
  assert(fields.includes('required_field'));
});
```

## Continuous Integration

Tests run automatically in GitHub Actions on every push and pull request.

The CI workflow:
1. Type-checks all edge function files
2. Runs `deno task test:edge`
3. Uploads JUnit test results as artifact
4. Publishes test report

See `.github/workflows/deno-tests.yml` for the full configuration.
