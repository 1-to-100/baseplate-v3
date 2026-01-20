# Edge Function Unit Tests

Unit and contract tests for Supabase Edge Functions using Deno.

## Setup

No installation required - Deno manages dependencies automatically via import maps in `deno.json`.

## Running Tests

```bash
# Navigate to the edge-functions test directory
cd testing/unit/edge-functions

# Run all tests
deno task test

# Run tests in watch mode (re-runs on file changes)
deno task test:watch

# Run a specific test file
deno test --allow-net --allow-env --allow-read get-competitor-list.test.ts
```

## Test Categories

### 1. Schema Validation Tests (Unit Tests)

Tests that verify Zod schemas correctly validate data structures. These run without network access.

- **Valid response handling** - Ensures correctly structured data passes validation
- **Required field enforcement** - Verifies missing required fields are rejected
- **Strict mode enforcement** - Confirms extra/unknown fields are rejected (matches OpenAI strict mode)
- **Edge cases** - Empty arrays, null values, boundary conditions

### 2. JSON Schema Export Tests

Tests that verify the generated JSON Schema (used for OpenAI's `response_format`) has the correct structure.

- **Structure validation** - Confirms `type: 'json_schema'`, `strict: true`, and proper nesting
- **Property existence** - Ensures all expected properties are defined
- **OpenAI compatibility** - Validates schema meets OpenAI strict mode requirements

### 3. Contract Tests

Tests that verify the Zod schema and JSON Schema remain in sync - critical for ensuring type safety end-to-end.

- **Required fields alignment** - JSON Schema `required` array matches Zod schema
- **Nested structure alignment** - Nested object definitions match between schemas
- **additionalProperties enforcement** - Both schemas reject extra fields
- **OpenAI strict mode requirements** - All objects have `additionalProperties: false`

### 4. Integration Tests (Optional)

Tests that call deployed Edge Functions to verify real responses match expected schemas.

These tests are **skipped by default** and only run when environment variables are set.

#### Required Environment Variables

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export TEST_AUTH_TOKEN="valid-jwt-token"
export TEST_CUSTOMER_ID="uuid-of-test-customer"
```

#### Running Integration Tests

```bash
# Set environment variables, then run
deno task test
```

## Test Pattern: Schema-First Testing

These tests follow the **schema-first testing pattern**:

1. **Single Source of Truth** - Zod schemas define both:
   - TypeScript types (via `z.infer<typeof Schema>`)
   - OpenAI JSON Schema (via `zodToJsonSchema()`)

2. **Contract Testing** - Tests verify Zod and JSON Schema stay aligned, ensuring:
   - What we tell OpenAI to return matches what we validate
   - Type safety from API response through to application code

3. **Layered Validation**:
   ```
   OpenAI Response
        ↓
   JSON Schema (enforced by OpenAI strict mode)
        ↓
   Zod Schema (runtime validation in Edge Function)
        ↓
   TypeScript Types (compile-time safety)
   ```

## Adding New Tests

When adding tests for a new Edge Function:

1. Create `<function-name>.test.ts` in this directory
2. Import the schema from the Edge Function's `schema.ts` (path goes up 3 levels to repo root):
   ```typescript
   import {
     MyResponseSchema,
     safeParseMyResponse,
     myJsonSchema,
   } from '../../../src/app/(scalekit)/<app>/lib/edge/<function>/schema.ts';
   ```
3. Add tests for each category (schema, JSON export, contract, integration)
4. Update `deno.json` imports if new dependencies are needed

## Continuous Integration

These tests run in GitHub Actions on:
- Push to `src/**/edge/**`
- Push to `testing/unit/edge-functions/**`
- Push to `supabase/functions/**`

See `.github/workflows/deno-tests.yml` for the full CI configuration.
