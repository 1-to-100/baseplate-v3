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
    "openai": "npm:openai@6.17.0",
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
```

## LLM Provider Adapters

Edge functions that call LLM APIs (OpenAI, Anthropic, Gemini) should use the centralized provider adapters instead of directly instantiating SDK clients.

### Location

```
supabase/functions/_shared/llm/
├── index.ts              # Main exports (providers, withLogging)
├── adapters/             # Provider-specific adapters
│   ├── openai.ts         # OpenAI SDK adapter
│   ├── anthropic.ts      # Anthropic SDK adapter
│   └── gemini.ts         # Google Gemini adapter
├── credentials.ts        # Credential management
├── errors.ts             # LLMError class with error normalization
└── logging.ts            # Structured logging utilities
```

### Usage Pattern

```typescript
import {
  providers,
  withLogging,
} from '../../../../../../../supabase/functions/_shared/llm/index.ts';

// Get OpenAI client (handles credentials automatically)
const openai = providers.openai();

// Chat Completions API
const completion = await withLogging('openai', 'chat.completions.create', 'gpt-4o', () =>
  openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }],
  })
);

// Responses API (with web_search, reasoning, etc.)
const response = await withLogging('openai', 'responses.create', 'gpt-5', () =>
  openai.responses.create({
    model: 'gpt-5',
    input: combinedPrompt,
    tools: [{ type: 'web_search' as const, search_context_size: 'medium' as const }],
    text: {
      format: {
        type: 'json_schema' as const,
        name: myJsonSchema.name,
        strict: myJsonSchema.strict,
        schema: myJsonSchema.schema,
      },
    },
  })
);

// Extract response text using SDK helper
const text = response.output_text;

// Images API
const images = await withLogging('openai', 'images.generate', 'gpt-image-1.5', () =>
  openai.images.generate({
    model: 'gpt-image-1.5',
    prompt: 'A logo for...',
    n: 1,
    size: '1024x1024',
  })
);
```

### Benefits

1. **Centralized credentials** - No need to call `Deno.env.get('OPENAI_API_KEY')` in each function
2. **Structured logging** - All LLM calls are logged with provider, operation, model, and latency
3. **Error normalization** - Provider-specific errors are normalized to `LLMError` with consistent error codes
4. **Singleton pattern** - SDK clients are reused across calls within the same function invocation
5. **Type safety** - Full TypeScript types from the native SDKs

### Environment Variables

The adapters read credentials from environment variables:

| Provider | Required | Optional |
|----------|----------|----------|
| OpenAI | `OPENAI_API_KEY` | `OPENAI_ORGANIZATION_ID` |
| Anthropic | `ANTHROPIC_API_KEY` | - |
| Gemini | `GOOGLE_API_KEY` | - |

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

### Testing strategy-forge functions

Strategy-forge edge functions (and other feature functions under `src/app/(scalekit)/.../lib/edge/`) are refactored for testability:

- **Handler injection**: Each function exports `createHandler(deps)` and runs `Deno.serve(createHandler())` so the same handler can be exercised in tests with mocked dependencies (`authenticateRequest`, `createServiceClient`, LLM/search APIs, etc.).
- **Schema tests**: Co-located `schema.test.ts` next to each function validate Zod request/response schemas using the shared mock generator (valid mocks, invalid/missing/extra fields, contract checks).
- **Behavioral tests**: Handler-level tests live in `supabase/functions/_tests/` (e.g. `segments-create.test.ts`, `company-scoring.test.ts`). They import `createHandler` from the source path, build mock deps (auth, Supabase, external APIs), send `Request` objects, and assert on `Response` status and body.

Run everything with `deno task test:edge` from the repo root.

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
   import {
     providers,
     withLogging,
   } from '../../../../../../../supabase/functions/_shared/llm/index.ts';
   import { myJsonSchema, parseMyResponse } from './schema.ts';

   Deno.serve(async (req) => {
     // ... authentication and request parsing

     // Get OpenAI client from provider adapters
     const openai = providers.openai();

     // Call LLM with logging
     const response = await withLogging('openai', 'responses.create', 'gpt-5', () =>
       openai.responses.create({
         model: 'gpt-5',
         input: prompt,
         text: {
           format: {
             type: 'json_schema' as const,
             name: myJsonSchema.name,
             strict: myJsonSchema.strict,
             schema: myJsonSchema.schema,
           },
         },
       })
     );

     // Parse response
     const parsed = parseMyResponse(JSON.parse(response.output_text));

     // ... return response
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
