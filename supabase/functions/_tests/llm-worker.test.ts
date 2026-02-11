/**
 * Behavioral Tests for llm-worker Edge Function
 *
 * These tests verify actual behavior by calling the exported handler with mocked dependencies.
 *
 * Run with: deno test --allow-env --allow-net --allow-read supabase/functions/_tests/llm-worker.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createHandler, type HandlerDeps, type LLMProviders } from "../llm-worker/index.ts";
import { LLMError } from "../_shared/llm/errors.ts";

// ============================================================================
// Test Utilities
// ============================================================================

function createRequest(options: {
  method?: string;
} = {}): Request {
  const { method = "POST" } = options;

  return new Request("http://localhost/llm-worker", {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

async function parseJsonResponse(response: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = await response.json();
  return { status: response.status, body };
}

/**
 * Create a mock job
 */
function createMockJob(overrides: Partial<{
  id: string;
  customer_id: string;
  user_id: string | null;
  provider_id: string;
  prompt: string;
  input: Record<string, unknown>;
  system_prompt: string | null;
  feature_slug: string | null;
  status: string;
  retry_count: number;
  created_at: string;
  messages: unknown[] | null;
  context: Record<string, unknown>;
  api_method: "chat" | "responses";
}> = {}) {
  return {
    id: "job-123",
    customer_id: "cust-123",
    user_id: "user-123",
    provider_id: "prov-123",
    prompt: "Hello, world!",
    input: {},
    system_prompt: null,
    feature_slug: null,
    status: "running",
    retry_count: 0,
    created_at: new Date().toISOString(),
    messages: null,
    context: {},
    api_method: "chat" as const,
    ...overrides,
  };
}

/**
 * Create a mock provider
 */
function createMockProvider(overrides: Partial<{
  id: string;
  slug: string;
  name: string;
  timeout_seconds: number;
  max_retries: number;
  retry_delay_seconds: number;
  config: Record<string, unknown>;
}> = {}) {
  return {
    id: "prov-123",
    slug: "openai",
    name: "OpenAI",
    timeout_seconds: 60,
    max_retries: 3,
    retry_delay_seconds: 5,
    config: { model: "gpt-4o" },
    ...overrides,
  };
}

/**
 * Create mock Supabase client
 */
function createMockSupabaseClient(options: {
  claimJob?: { data: ReturnType<typeof createMockJob> | null; error?: unknown };
  provider?: { data: ReturnType<typeof createMockProvider> | null; error?: unknown };
  updateResult?: { error?: unknown };
} = {}) {
  const {
    claimJob = { data: createMockJob() },
    provider = { data: createMockProvider() },
    updateResult = {},
  } = options;

  let fromTable = "";

  return {
    from: (table: string) => {
      fromTable = table;
      return {
        update: (_data: unknown) => ({
          in: () => ({
            order: () => ({
              limit: () => ({
                select: () => ({
                  maybeSingle: () => Promise.resolve(claimJob),
                }),
              }),
            }),
          }),
          eq: () => Promise.resolve(updateResult),
        }),
        insert: (_data: unknown) => Promise.resolve({ data: null, error: null }),
        select: () => ({
          eq: () => ({
            single: () => {
              if (fromTable === "llm_providers") {
                return Promise.resolve(provider);
              }
              return Promise.resolve({ data: null });
            },
          }),
        }),
      };
    },
  };
}

/**
 * Create mock OpenAI SDK client
 */
function createMockOpenAIClient(options: {
  response?: unknown;
  responsesResponse?: unknown;
  shouldFail?: boolean;
  errorMessage?: string;
  shouldTimeout?: boolean;
  isRetryable?: boolean;
} = {}) {
  const {
    response = {
      id: "resp-123",
      model: "gpt-4o",
      choices: [
        {
          message: { role: "assistant", content: "Hello from OpenAI!" },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    },
    responsesResponse = {
      id: "resp-responses-123",
      output_text: "Hello from Responses API!",
      usage: { input_tokens: 10, output_tokens: 5 },
    },
    shouldFail = false,
    errorMessage = "API error",
    shouldTimeout = false,
    isRetryable = true,
  } = options;

  return {
    chat: {
      completions: {
        create: async () => {
          if (shouldTimeout) {
            throw new LLMError("Request timed out", "TIMEOUT", "openai", 408, true);
          }
          if (shouldFail) {
            const errorCode = isRetryable ? "PROVIDER_UNAVAILABLE" : "INVALID_REQUEST";
            throw new LLMError(errorMessage, errorCode, "openai", 500, isRetryable);
          }
          return response;
        },
      },
    },
    responses: {
      create: async () => {
        if (shouldFail) {
          const errorCode = isRetryable ? "PROVIDER_UNAVAILABLE" : "INVALID_REQUEST";
          throw new LLMError(errorMessage, errorCode, "openai", 500, isRetryable);
        }
        return responsesResponse;
      },
    },
  };
}

/**
 * Create mock Anthropic SDK client
 */
function createMockAnthropicClient(options: {
  response?: unknown;
  shouldFail?: boolean;
  errorMessage?: string;
  isRetryable?: boolean;
} = {}) {
  const {
    response = {
      id: "msg-123",
      model: "claude-sonnet-4-20250514",
      content: [{ type: "text", text: "Hello from Anthropic!" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    },
    shouldFail = false,
    errorMessage = "API error",
    isRetryable = false,
  } = options;

  return {
    messages: {
      create: async () => {
        if (shouldFail) {
          const errorCode = isRetryable ? "PROVIDER_UNAVAILABLE" : "INVALID_REQUEST";
          throw new LLMError(errorMessage, errorCode, "anthropic", 500, isRetryable);
        }
        return response;
      },
    },
  };
}

/**
 * Create mock Gemini SDK client
 */
function createMockGeminiClient(options: {
  response?: unknown;
  shouldFail?: boolean;
  errorMessage?: string;
  isRetryable?: boolean;
} = {}) {
  const {
    response = {
      response: {
        text: () => "Hello from Gemini!",
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      },
    },
    shouldFail = false,
    errorMessage = "API error",
    isRetryable = false,
  } = options;

  return {
    getGenerativeModel: () => ({
      generateContent: async () => {
        if (shouldFail) {
          const errorCode = isRetryable ? "PROVIDER_UNAVAILABLE" : "INVALID_REQUEST";
          throw new LLMError(errorMessage, errorCode, "gemini", 500, isRetryable);
        }
        return response;
      },
    }),
  };
}

/**
 * Create mock LLM providers
 */
function createMockLLMProviders(options: {
  openaiOptions?: Parameters<typeof createMockOpenAIClient>[0];
  anthropicOptions?: Parameters<typeof createMockAnthropicClient>[0];
  geminiOptions?: Parameters<typeof createMockGeminiClient>[0];
} = {}): LLMProviders {
  const { openaiOptions, anthropicOptions, geminiOptions } = options;

  return {
    // deno-lint-ignore no-explicit-any
    openai: () => createMockOpenAIClient(openaiOptions) as any,
    // deno-lint-ignore no-explicit-any
    anthropic: () => createMockAnthropicClient(anthropicOptions) as any,
    // deno-lint-ignore no-explicit-any
    gemini: () => createMockGeminiClient(geminiOptions) as any,
  };
}

/**
 * Create mock dependencies
 */
function createMockDeps(options: {
  supabaseOptions?: Parameters<typeof createMockSupabaseClient>[0];
  llmProviderOptions?: Parameters<typeof createMockLLMProviders>[0];
  getResponseProcessor?: HandlerDeps["getResponseProcessor"];
} = {}): HandlerDeps {
  const { supabaseOptions, llmProviderOptions, getResponseProcessor } = options;

  return {
    createServiceClient: () => createMockSupabaseClient(supabaseOptions),
    llmProviders: createMockLLMProviders(llmProviderOptions),
    ...(getResponseProcessor !== undefined && { getResponseProcessor }),
  };
}

// ============================================================================
// Behavioral Tests
// ============================================================================

Deno.test("llm-worker: No Jobs Available", async (t) => {
  await t.step("returns processed=false when no jobs to process", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: null }, // No jobs available
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, false);
    assertEquals(body.message, "No jobs to process");
  });
});

Deno.test("llm-worker: Successful Job Processing", async (t) => {
  await t.step("processes OpenAI job successfully", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob() },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          response: {
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
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
    assertEquals(body.job_id, "job-123");
  });

  await t.step("processes Anthropic job successfully", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob() },
        provider: { data: createMockProvider({ slug: "anthropic" }) },
      },
      llmProviderOptions: {
        anthropicOptions: {
          response: {
            id: "msg-123",
            model: "claude-sonnet-4-20250514",
            content: [{ type: "text", text: "Hello from Anthropic!" }],
            usage: { input_tokens: 10, output_tokens: 5 },
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
  });

  await t.step("processes Gemini job successfully", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob() },
        provider: { data: createMockProvider({ slug: "gemini" }) },
      },
      llmProviderOptions: {
        geminiOptions: {
          response: {
            response: {
              text: () => "Hello from Gemini!",
              usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 5,
                totalTokenCount: 15,
              },
            },
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
  });
});

Deno.test("llm-worker: Error Handling", async (t) => {
  await t.step("returns error when provider not found", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob() },
        provider: { data: null, error: { message: "Not found" } },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 500);
    assertStringIncludes(body.error as string, "not found");
  });

  await t.step("handles API error (non-retryable)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ slug: "openai", max_retries: 3 }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldFail: true,
          errorMessage: "Invalid API key",
          isRetryable: false, // Non-retryable error
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "exhausted");
    assertExists(body.message);
  });

  await t.step("handles unsupported provider", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ slug: "unknown", max_retries: 3 }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "failed");
    assertStringIncludes(body.message as string, "Unsupported provider");
  });
});

Deno.test("llm-worker: Retry Logic", async (t) => {
  await t.step("schedules retry when retryable error and retries available", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ max_retries: 3, slug: "openai" }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldFail: true,
          errorMessage: "Network error",
          isRetryable: true, // Retryable error
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "retrying");
    assertStringIncludes(body.message as string, "retry");
  });

  await t.step("marks job as exhausted when max retries exceeded", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 3 }) },
        provider: { data: createMockProvider({ max_retries: 3, slug: "openai" }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldFail: true,
          errorMessage: "Network error",
          isRetryable: true, // Retryable but at max retries
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "exhausted");
    assertStringIncludes(body.message as string, "Max retries");
  });

  await t.step("handles non-retryable error by marking exhausted immediately", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldFail: true,
          errorMessage: "Invalid request",
          isRetryable: false, // Not retryable
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "exhausted");
    assertStringIncludes(body.message as string, "Non-retryable");
  });

  await t.step("handles request timeout (retryable)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ timeout_seconds: 30, max_retries: 3, slug: "openai" }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldTimeout: true,
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    // Timeout is retryable by default
    assertEquals(body.status, "retrying");
  });

  await t.step("marks job exhausted when timeout after max retries", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 3 }) },
        provider: { data: createMockProvider({ max_retries: 3, timeout_seconds: 30, slug: "openai" }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldTimeout: true,
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "exhausted");
    assertStringIncludes(body.message as string, "Max retries");
  });
});

Deno.test("llm-worker: CORS", async (t) => {
  await t.step("OPTIONS request returns CORS headers", async () => {
    // Set allowed origins for CORS validation
    const originalOrigins = Deno.env.get("ALLOWED_ORIGINS");
    Deno.env.set("ALLOWED_ORIGINS", "http://localhost:3000");

    try {
      const deps = createMockDeps();
      const handler = createHandler(deps);
      const request = new Request("http://localhost/llm-worker", {
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

Deno.test("llm-worker: Response Format", async (t) => {
  await t.step("success response includes job_id and status", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertExists(body.job_id);
    assertExists(body.status);
  });

  await t.step("no jobs response has processed=false", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: null },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { body } = await parseJsonResponse(response);

    assertEquals(body.processed, false);
    assertEquals(body.message, "No jobs to process");
  });
});

Deno.test("llm-worker: Provider Response Parsing", async (t) => {
  await t.step("handles OpenAI response with no content gracefully", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ slug: "openai", max_retries: 3 }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          response: {
            id: "resp-123",
            model: "gpt-4o",
            choices: [], // Empty choices - no content
            usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    // Should fail because no content in response (treated as non-retryable LLMError)
    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "exhausted");
  });

  await t.step("handles Anthropic response with empty content", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ slug: "anthropic", max_retries: 3 }) },
      },
      llmProviderOptions: {
        anthropicOptions: {
          response: {
            id: "msg-123",
            model: "claude-sonnet-4-20250514",
            content: [], // Empty content
            usage: { input_tokens: 10, output_tokens: 0 },
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    // Should fail because no text content (treated as non-retryable LLMError)
    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "exhausted");
  });
});

// ============================================================================
// Multimodal Messages Tests
// ============================================================================

Deno.test("llm-worker: Multimodal Messages", async (t) => {
  await t.step("uses job.messages directly when set (skips prompt construction)", async () => {
    const multimodalMessages = [
      { role: "system", content: "You are a design analyst." },
      {
        role: "user",
        content: [
          { type: "text", text: "Describe the colors in this image" },
          { type: "image_url", image_url: { url: "https://example.com/img.png" } },
        ],
      },
    ];
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({
            messages: multimodalMessages,
            prompt: "This prompt should be ignored",
          }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
  });

  await t.step("constructs messages from system_prompt + prompt when messages is null", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({
            messages: null,
            system_prompt: "You are helpful",
            prompt: "Hello!",
          }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
  });
});

// ============================================================================
// Responses API Tests
// ============================================================================

Deno.test("llm-worker: Responses API Routing", async (t) => {
  await t.step("api_method='responses' routes to OpenAI Responses API", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ api_method: "responses" }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
  });

  await t.step("Responses API with no output_text returns exhausted", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ api_method: "responses", retry_count: 0 }),
        },
        provider: { data: createMockProvider({ slug: "openai", max_retries: 3 }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          responsesResponse: {
            id: "resp-empty",
            output_text: null, // No output text
            usage: { input_tokens: 10, output_tokens: 0 },
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "exhausted");
  });

  await t.step("Responses API uses model from job.input when provided", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({
            api_method: "responses",
            input: { model: "gpt-5" },
          }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
  });
});

// ============================================================================
// Response Processor Tests
// ============================================================================

Deno.test("llm-worker: Response Processor Integration", async (t) => {
  await t.step("processor success: runs processor then completes job", async () => {
    let processorCalled = false;
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ feature_slug: "extract-colors" }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
      getResponseProcessor: (slug) => {
        if (slug === "extract-colors") {
          return async () => {
            processorCalled = true;
          };
        }
        return null;
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
    assertEquals(processorCalled, true);
  });

  await t.step("processor failure: sets post_processing_failed status", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ feature_slug: "extract-colors" }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
      getResponseProcessor: (slug) => {
        if (slug === "extract-colors") {
          return async () => {
            throw new Error("Invalid JSON in colors response");
          };
        }
        return null;
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "post_processing_failed");
    assertStringIncludes(body.message as string, "Invalid JSON");
  });

  await t.step("no processor registered: completes normally for unknown slug", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ feature_slug: "unknown-feature" }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
      getResponseProcessor: () => null, // No processor found
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
  });

  await t.step("null feature_slug: skips processor and completes normally", async () => {
    let processorQueried = false;
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ feature_slug: null }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
      getResponseProcessor: (slug) => {
        processorQueried = true;
        assertEquals(slug, null);
        return null;
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
    assertEquals(processorQueried, true);
  });
});

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

Deno.test("llm-worker: Backward Compatibility", async (t) => {
  await t.step("job with default new fields works like before", async () => {
    // Job with messages=null, api_method='chat', context={} — should behave exactly like pre-extension
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({
            messages: null,
            api_method: "chat",
            context: {},
            feature_slug: null,
          }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
    assertEquals(body.job_id, "job-123");
  });

  await t.step("chat with messages + input.response_format both passed", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({
            messages: [
              { role: "system", content: "You are helpful" },
              { role: "user", content: "Hello" },
            ],
            input: { response_format: { type: "json_object" } },
          }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.status, "completed");
  });
});
