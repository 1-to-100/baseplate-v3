# Supabase Edge Functions

This directory contains Supabase Edge Functions with a wrapper pattern that keeps source code co-located with Next.js features.

## Directory Structure

```
deno.json                              # Root config with shared dependencies
src/app/(scalekit)/{feature}/lib/edge/
├── {function-name}/                   # Function implementations
│   ├── index.ts                       # Function entry point
│   ├── schema.ts                      # Zod schemas for OpenAI structured outputs
│   └── schema.test.ts                 # Co-located tests

supabase/functions/
├── {function-name}/                   # Function wrappers (thin re-exports)
│   └── index.ts
└── README.md
```

## Dependency Management

Dependencies are managed in the **root `deno.json`** file. All edge functions share the same dependency versions:

```json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@1",
    "zod": "npm:zod@3.24.1",
    "zod-to-json-schema": "npm:zod-to-json-schema@3.24.1",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.49.4",
    "openai": "npm:openai@4.77.0",
    "puppeteer": "npm:puppeteer@23.11.1"
  }
}
```

### Usage in Source Files

```typescript
// schema.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// index.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
```

## Wrapper Pattern

Edge functions use a wrapper pattern to keep source code with features while deploying from `supabase/functions/`.

### Why Wrappers?

1. **Co-location**: Function code lives with the Next.js feature that uses it
2. **Shared schemas**: TypeScript types can be imported by both the app and edge function
3. **Standard deployment**: Supabase CLI deploys from `supabase/functions/`

### Wrapper Structure

Each wrapper in `supabase/functions/{name}/index.ts` is a thin re-export:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "../../../src/app/(scalekit)/{feature}/lib/edge/{function-name}/index.ts";
```

### Generating Wrappers

Run the wrapper script after adding new functions:

```bash
node supabase/scripts/wrap-feature-functions.mjs
```

## Testing

### Running All Tests

From the repository root:

```bash
deno task test:edge
```

This runs all schema tests across all edge functions and the mock generator utility tests.

### Test Structure

Each edge function has co-located schema tests (`schema.test.ts`) that validate:
- Zod schema accepts valid data
- Invalid data is rejected (wrong types, missing fields, extra fields)
- JSON Schema exports correctly for OpenAI

### Mock Generator

Tests use a shared mock generator (`testing/unit/edge-functions/mock-generator.ts`) that:
- Generates valid mock data from Zod schemas
- Creates invalid mocks for testing rejection
- Provides schema introspection helpers

```typescript
import { generateMock, generateInvalidMock } from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';
import { MySchema } from './schema.ts';

const validData = generateMock(MySchema);
const invalidData = generateInvalidMock(MySchema, ['requiredField']);
```

## Local Development

### Serve Functions Locally

```bash
# Serve a specific function
supabase functions serve {function-name} --no-verify-jwt

# Serve all functions
supabase functions serve --no-verify-jwt
```

### Test with curl

```bash
curl http://127.0.0.1:54321/functions/v1/{function-name}
```

## Adding a New Edge Function

1. **Create the source directory**:
   ```bash
   mkdir -p src/app/(scalekit)/{feature}/lib/edge/{function-name}
   ```

2. **Create the schema** (`schema.ts`):
   ```typescript
   import { z } from 'zod';
   import { zodToJsonSchema } from 'zod-to-json-schema';

   export const MyResponseSchema = z.object({
     // ... your schema
   }).strict();

   export type MyResponse = z.infer<typeof MyResponseSchema>;

   export const myJsonSchema = createOpenAIJsonSchema(MyResponseSchema, 'my_response');
   ```

3. **Create the function** (`index.ts`):
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import { myJsonSchema, parseMyResponse } from './schema.ts';

   Deno.serve(async (req) => {
     // ... your function logic
   });
   ```

4. **Create tests** (`schema.test.ts`):
   ```typescript
   import { assertEquals } from '@std/assert';
   import { MyResponseSchema, safeParseMyResponse } from './schema.ts';
   import { generateMock } from '../../../../../../../testing/unit/edge-functions/mock-generator.ts';

   Deno.test('Schema: validates generated mock', () => {
     const mock = generateMock(MyResponseSchema);
     const result = safeParseMyResponse(mock);
     assertEquals(result.success, true);
   });
   ```

5. **Generate the wrapper**:
   ```bash
   node supabase/scripts/wrap-feature-functions.mjs
   ```

6. **Run tests**:
   ```bash
   deno task test:edge
   ```

## Deployment

Deploy functions to Supabase:

```bash
# Deploy all functions
./supabase/scripts/deploy-functions.sh

# Or deploy a specific function
supabase functions deploy {function-name}
```

## Troubleshooting

### Import Resolution Errors

If you see errors about missing imports:
1. Ensure the import is mapped in the root `deno.json`
2. Check the bare specifier matches the import map key
3. Run `deno cache` to refresh dependencies

### Adding New Dependencies

Add new dependencies to the root `deno.json` imports map. All edge functions share the same dependency versions.
