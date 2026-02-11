/**
 * Behavioral Tests for llm-query Edge Function
 *
 * These tests verify actual behavior by calling the exported handler with mocked dependencies.
 *
 * Run with: deno test --allow-env --allow-net --allow-read supabase/functions/_tests/llm-query.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createHandler, type HandlerDeps, type LLMProviders } from "../llm-query/index.ts";
import { ApiError } from "../_shared/errors.ts";
import type { AuthResult } from "../_shared/auth.ts";
import type { AuthenticatedUser } from "../_shared/types.ts";

// ============================================================================
// Test Utilities
// ============================================================================

function createRequest(options: {
  method?: string;
  body?: unknown;
  token?: string | null;
} = {}): Request {
  const { method = "POST", body, token = "valid-token" } = options;

  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return new Request("http://localhost/llm-query", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJsonResponse(response: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = await response.json();
  return { status: response.status, body };
}

/**
 * Create mock user
 */
function createMockUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "auth-user-123",
    email: "user@example.com",
    user_id: "user-123",
    customer_id: "customer-123",
    role: { name: "user", is_system_role: false },
    ...overrides,
  };
}

/**
 * Create mock Supabase client with configurable responses
 */
function createMockSupabaseClient(options: {
  customerName?: string;
  rateLimitResponse?: { used: number; quota: number } | null;
  rateLimitError?: boolean;
  rateLimitExceeded?: { used: number; quota: number; reset_at: string };
  provider?: { id: string; slug: string; name: string; timeout_seconds: number; max_retries: number; config: Record<string, unknown> } | null;
  providerError?: boolean;
  jobCreated?: { id: string; status: string } | null;
  jobError?: boolean;
} = {}) {
  const {
    customerName = "Test Customer",
    rateLimitResponse = { used: 5, quota: 1000 },
    rateLimitError = false,
    rateLimitExceeded,
    provider = { id: "prov-123", slug: "openai", name: "OpenAI", timeout_seconds: 60, max_retries: 3, config: { model: "gpt-4o" } },
    providerError = false,
    jobCreated = { id: "job-123", status: "queued" },
    jobError = false,
  } = options;

  let currentTable = "";

  return {
    from: (table: string) => {
      currentTable = table;
      return {
        select: (_fields: string) => ({
          eq: (_field: string, _value: unknown) => ({
            single: () => {
              if (currentTable === "customers") {
                return Promise.resolve({ data: { name: customerName }, error: null });
              }
              if (currentTable === "llm_providers") {
                if (providerError || !provider) {
                  return Promise.resolve({ data: null, error: { message: "Not found" } });
                }
                return Promise.resolve({ data: provider, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            },
            eq: (_field2: string, _value2: unknown) => ({
              single: () => {
                if (currentTable === "llm_providers") {
                  if (providerError || !provider) {
                    return Promise.resolve({ data: null, error: { message: "Not found" } });
                  }
                  return Promise.resolve({ data: provider, error: null });
                }
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        }),
        insert: (_data: unknown) => ({
          select: (_fields: string) => ({
            single: () => {
              if (jobError || !jobCreated) {
                return Promise.resolve({ data: null, error: { message: "Insert failed" } });
              }
              return Promise.resolve({ data: jobCreated, error: null });
            },
          }),
        }),
        update: (_data: unknown) => ({
          eq: (_field: string, _value: unknown) => Promise.resolve({ error: null }),
        }),
      };
    },
    rpc: (fnName: string, _params: Record<string, unknown>) => {
      if (fnName === "llm_increment_rate_limit") {
        if (rateLimitError) {
          return Promise.resolve({ data: null, error: { message: "RPC error" } });
        }
        if (rateLimitExceeded) {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: rateLimitResponse, error: null });
      }
      if (fnName === "llm_check_rate_limit") {
        if (rateLimitExceeded) {
          return Promise.resolve({ data: [rateLimitExceeded], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

/**
 * Create mock OpenAI SDK client
 */
function createMockOpenAIClient(response?: unknown) {
  return {
    chat: {
      completions: {
        create: async () => response || {
          id: "resp-123",
          model: "gpt-4o",
          choices: [
            {
              message: { role: "assistant", content: "Hello from OpenAI!" },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        },
      },
    },
  };
}

/**
 * Create mock Anthropic SDK client
 */
function createMockAnthropicClient(response?: unknown) {
  return {
    messages: {
      create: async () => response || {
        id: "msg-123",
        model: "claude-sonnet-4-20250514",
        content: [{ type: "text", text: "Hello from Anthropic!" }],
        usage: { input_tokens: 10, output_tokens: 5 },
      },
    },
  };
}

/**
 * Create mock Gemini SDK client
 */
function createMockGeminiClient(response?: unknown) {
  return {
    getGenerativeModel: () => ({
      generateContent: async () => response || {
        response: {
          text: () => "Hello from Gemini!",
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15,
          },
        },
      },
    }),
  };
}

/**
 * Create mock LLM providers
 */
function createMockLLMProviders(): LLMProviders {
  return {
    // deno-lint-ignore no-explicit-any
    openai: () => createMockOpenAIClient() as any,
    // deno-lint-ignore no-explicit-any
    anthropic: () => createMockAnthropicClient() as any,
    // deno-lint-ignore no-explicit-any
    gemini: () => createMockGeminiClient() as any,
  };
}

/**
 * Create mock dependencies
 */
function createMockDeps(options: {
  user?: AuthenticatedUser | null;
  authError?: Error;
  supabaseOptions?: Parameters<typeof createMockSupabaseClient>[0];
} = {}): HandlerDeps {
  const { user = createMockUser(), authError, supabaseOptions } = options;

  return {
    authenticateRequest: async (_req: Request): Promise<AuthResult> => {
      if (authError) throw authError;
      if (!user) throw new ApiError("No user", 401);
      return {
        user,
        userClient: createMockSupabaseClient(supabaseOptions),
      };
    },
    llmProviders: createMockLLMProviders(),
  };
}

// ============================================================================
// Behavioral Tests
// ============================================================================

Deno.test("llm-query: Validation Errors", async (t) => {
  await t.step("returns 400 when prompt is missing", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { provider_slug: "openai" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "prompt");
  });

  await t.step("returns 400 when prompt is empty string", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    // Empty string is falsy, so it hits "required" check first
    assertStringIncludes(body.error as string, "prompt");
  });

  await t.step("returns 400 when prompt is only whitespace", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "   \n\t  " } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "empty");
  });

  await t.step("returns 400 when prompt exceeds 100KB", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const oversizedPrompt = "x".repeat(100001);
    const request = createRequest({ body: { prompt: oversizedPrompt } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "maximum length");
  });

  await t.step("returns 405 for non-POST requests", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);

    for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
      const request = new Request("http://localhost/llm-query", { method });
      const response = await handler(request);
      const { status, body } = await parseJsonResponse(response);

      assertEquals(status, 405, `${method} should be rejected`);
      assertStringIncludes(body.error as string, "Method not allowed");
    }
  });

  await t.step("returns 400 when feature_slug exceeds 100 characters", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const longSlug = "x".repeat(101);
    const request = createRequest({ body: { prompt: "Hello", feature_slug: longSlug } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "feature_slug exceeds maximum length");
  });

  await t.step("returns 400 when feature_slug contains invalid characters", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello", feature_slug: "feature with spaces!" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "may only contain letters, numbers, hyphens");
  });

  await t.step("returns 400 when input is not an object", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello", input: "not an object" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "input must be an object");
  });

  await t.step("returns 400 when system_prompt is not a string", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello", system_prompt: 123 } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "system_prompt must be a string");
  });

  await t.step("returns 400 when provider_slug is not a string", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello", provider_slug: 123 } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "provider_slug must be a string");
  });

  await t.step("accepts valid feature_slug with hyphens and underscores", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello", feature_slug: "my-feature_v2" } });

    const response = await handler(request);
    const { status } = await parseJsonResponse(response);

    // Should pass validation and complete sync request (200 for sync mode)
    assertEquals(status, 200);
  });
});

Deno.test("llm-query: Authentication", async (t) => {
  await t.step("returns 401 when no Authorization header", async () => {
    const deps = createMockDeps({
      authError: new ApiError("Missing authorization header", 401),
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello" }, token: null });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 401);
    assertStringIncludes(body.error as string, "authorization");
  });

  await t.step("returns 401 when token is invalid", async () => {
    const deps = createMockDeps({
      authError: new ApiError("Invalid or expired token", 401),
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello" }, token: "invalid-token" });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 401);
    assertStringIncludes(body.error as string, "Invalid");
  });
});

Deno.test("llm-query: Authorization", async (t) => {
  await t.step("returns 403 when user has no customer_id", async () => {
    const deps = createMockDeps({
      user: createMockUser({ customer_id: null }),
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 403);
    assertStringIncludes(body.error as string, "customer");
  });
});

Deno.test("llm-query: Rate Limiting", async (t) => {
  await t.step("returns 429 when rate limit exceeded", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        rateLimitExceeded: { used: 1000, quota: 1000, reset_at: "2026-03-01T00:00:00Z" },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 429);
    assertStringIncludes(body.error as string, "Rate limit exceeded");
  });

  await t.step("429 response includes used/quota info", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        rateLimitExceeded: { used: 1000, quota: 1000, reset_at: "2026-03-01T00:00:00Z" },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello" } });

    const response = await handler(request);
    const { body } = await parseJsonResponse(response);

    assertStringIncludes(body.error as string, "1000/1000");
  });
});

Deno.test("llm-query: Successful Request", async (t) => {
  await t.step("returns 200 with result for sync mode (default)", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "What is 2+2?" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.job_id, "job-123");
    assertEquals(body.status, "completed");
    assertExists(body.result);
    assertExists(body.rate_limit);
  });

  await t.step("response includes rate limit info", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        rateLimitResponse: { used: 5, quota: 1000 },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello" } });

    const response = await handler(request);
    const { body } = await parseJsonResponse(response);

    const rateLimit = body.rate_limit as { used: number; quota: number; remaining: number };
    assertEquals(rateLimit.used, 5);
    assertEquals(rateLimit.quota, 1000);
    assertEquals(rateLimit.remaining, 995);
  });
});

Deno.test("llm-query: Provider Validation", async (t) => {
  await t.step("returns 400 for unknown provider", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        provider: null,
        providerError: true,
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({
      body: { prompt: "Hello", provider_slug: "unknown-llm" },
    });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "unknown-llm");
    assertEquals(body.code, "INVALID_PROVIDER");
  });
});

Deno.test("llm-query: CORS", async (t) => {
  await t.step("OPTIONS request returns CORS headers", async () => {
    // Set allowed origins for CORS validation
    const originalOrigins = Deno.env.get("ALLOWED_ORIGINS");
    Deno.env.set("ALLOWED_ORIGINS", "http://localhost:3000");

    try {
      const deps = createMockDeps();
      const handler = createHandler(deps);
      const request = new Request("http://localhost/llm-query", {
        method: "OPTIONS",
        headers: { "Origin": "http://localhost:3000" },
      });

      const response = await handler(request);

      assertEquals(response.status, 200);
      assertExists(response.headers.get("Access-Control-Allow-Origin"));
      assertExists(response.headers.get("Access-Control-Allow-Headers"));
      assertExists(response.headers.get("Access-Control-Allow-Methods"));
    } finally {
      // Restore original value
      if (originalOrigins) {
        Deno.env.set("ALLOWED_ORIGINS", originalOrigins);
      } else {
        Deno.env.delete("ALLOWED_ORIGINS");
      }
    }
  });
});

Deno.test("llm-query: Error Response Format", async (t) => {
  await t.step("error responses have consistent structure", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: {} }); // Missing prompt

    const response = await handler(request);
    const { body } = await parseJsonResponse(response);

    assertExists(body.error);
    assertEquals(typeof body.error, "string");
  });

  await t.step("500 errors do not expose internal details", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        rateLimitError: true,
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { prompt: "Hello" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 500);
    // Should NOT contain stack traces or sensitive info
    const errorStr = body.error as string;
    assertEquals(errorStr.includes("at "), false);
    assertEquals(errorStr.includes("postgres://"), false);
  });
});
