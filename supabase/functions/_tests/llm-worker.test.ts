/**
 * Behavioral Tests for llm-worker Edge Function
 *
 * These tests verify actual behavior by calling the exported handler with mocked dependencies.
 * The worker reads from a pgmq dispatch queue and processes jobs in batches.
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
import type { SupabaseClient } from "../_shared/supabase.ts";

// ============================================================================
// Test Utilities
// ============================================================================

const TEST_QUEUE_SECRET = "test-queue-secret";

function createRequest(options: {
  method?: string;
  headers?: Record<string, string>;
} = {}): Request {
  const { method = "POST", headers = {} } = options;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "x-queue-secret": TEST_QUEUE_SECRET,
  };

  return new Request("http://localhost/llm-worker", {
    method,
    headers: { ...defaultHeaders, ...headers },
  });
}

async function parseJsonResponse(response: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = await response.json();
  return { status: response.status, body };
}

/**
 * Extract the first job result from the batch response.
 */
function firstResult(body: Record<string, unknown>): { job_id: string; status: string; message?: string } {
  const results = body.results as Array<{ job_id: string; status: string; message?: string }>;
  return results[0];
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
  model: string;
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
    model: "gpt-4o",
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
 * Create a pgmq queue message
 */
function createQueueMessage(overrides: Partial<{
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  job_id: string;
}> = {}) {
  const {
    msg_id = 1,
    read_ct = 1,
    enqueued_at = new Date().toISOString(),
    vt = new Date(Date.now() + 300000).toISOString(),
    job_id = "job-123",
  } = overrides;

  return {
    msg_id,
    read_ct,
    enqueued_at,
    vt,
    message: { job_id },
  };
}

/**
 * Create mock Supabase client with pgmq RPC support
 */
function createMockSupabaseClient(options: {
  queueMessages?: Array<ReturnType<typeof createQueueMessage>>;
  claimJob?: { data: ReturnType<typeof createMockJob> | null; error?: unknown };
  provider?: { data: ReturnType<typeof createMockProvider> | null; error?: unknown };
  updateResult?: { data?: { id: string } | null; error?: unknown };
  /** Result for C3 pre-processor status check (from('llm_jobs').select('status')...) */
  statusCheckResult?: { data: { status: string } | null };
} = {}) {
  const {
    claimJob = { data: createMockJob() },
    provider = { data: createMockProvider() },
    updateResult = { data: { id: "job-123" }, error: null },
    statusCheckResult = { data: { status: "running" } },
  } = options;

  // Derive queue messages from claimJob data if not explicitly provided
  const queueMessages = options.queueMessages ?? (
    claimJob.data
      ? [createQueueMessage({ job_id: claimJob.data.id })]
      : []
  );

  let fromTable = "";

  // Fluent chain that resolves to a given result when awaited or .maybeSingle()/.single() called
  const chain = (result: unknown) => {
    // deno-lint-ignore no-explicit-any
    const obj: Record<string, any> = {};
    ["eq", "in", "order", "limit", "select", "not", "is"].forEach((m) => {
      obj[m] = () => obj;
    });
    obj.maybeSingle = () => Promise.resolve(result);
    obj.single = () => Promise.resolve(result);
    // Make directly awaitable (for .update().eq() without .maybeSingle())
    const p = Promise.resolve(result);
    obj.then = p.then.bind(p);
    obj.catch = p.catch.bind(p);
    return obj;
  };

  const mockChannel = () => ({
    subscribe: (cb: (status: string) => void) => { cb("SUBSCRIBED"); },
    send: () => Promise.resolve("ok"),
    unsubscribe: () => Promise.resolve(),
  });

  return {
    rpc: (fnName: string, _params?: Record<string, unknown>) => {
      switch (fnName) {
        case 'llm_read_dispatch_queue':
          return Promise.resolve({ data: queueMessages, error: null });
        case 'llm_delete_dispatch_message':
          return Promise.resolve({ data: true, error: null });
        case 'llm_archive_dispatch_message':
          return Promise.resolve({ data: true, error: null });
        default:
          return Promise.resolve({ data: null, error: { message: `Unknown RPC: ${fnName}` } });
      }
    },
    from: (table: string) => {
      fromTable = table;
      return {
        update: (data: Record<string, unknown>) => {
          // Claim operations set status to 'running'
          if (data?.status === "running") {
            return chain(claimJob);
          }
          // All other status updates (waiting_llm, completed, retrying, etc.)
          return chain(updateResult);
        },
        insert: (_data: unknown) => Promise.resolve({ data: null, error: null }),
        select: () => ({
          eq: () => ({
            is: () => chain({ count: 0, error: null }),
            single: () => {
              if (fromTable === "llm_providers") {
                return Promise.resolve(provider);
              }
              if (fromTable === "llm_jobs") {
                return Promise.resolve(statusCheckResult);
              }
              return Promise.resolve({ data: null });
            },
          }),
        }),
      };
    },
    channel: mockChannel,
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
        if (shouldTimeout) {
          throw new LLMError("Request timed out", "TIMEOUT", "openai", 408, true);
        }
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
  envVars?: Record<string, string | undefined>;
} = {}): HandlerDeps {
  const { supabaseOptions, llmProviderOptions, getResponseProcessor, envVars = {} } = options;

  const defaultEnvVars: Record<string, string> = {
    QUEUE_SECRET: TEST_QUEUE_SECRET,
    ...envVars as Record<string, string>,
  };

  return {
    createServiceClient: () => createMockSupabaseClient(supabaseOptions) as unknown as SupabaseClient,
    getEnv: (key: string) => defaultEnvVars[key],
    llmProviders: createMockLLMProviders(llmProviderOptions),
    ...(getResponseProcessor !== undefined && { getResponseProcessor }),
  };
}

// ============================================================================
// Behavioral Tests
// ============================================================================

Deno.test("llm-worker: No Jobs Available", async (t) => {
  await t.step("returns processed=false when queue is empty", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        queueMessages: [], // Empty queue
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

Deno.test("llm-worker: Authentication", async (t) => {
  await t.step("rejects requests without x-queue-secret header", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = new Request("http://localhost/llm-worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 401);
    assertStringIncludes(body.error as string, "Unauthorized");
  });

  await t.step("rejects requests with invalid queue secret", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ headers: { "x-queue-secret": "wrong-secret" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 401);
    assertStringIncludes(body.error as string, "Unauthorized");
  });

  await t.step("accepts requests with valid queue secret", async () => {
    const deps = createMockDeps({
      supabaseOptions: { queueMessages: [] },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, false); // No jobs, but auth passed
  });

  await t.step("accepts requests when QUEUE_SECRET has surrounding whitespace", async () => {
    const deps = createMockDeps({
      supabaseOptions: { queueMessages: [] },
      envVars: { QUEUE_SECRET: `  ${TEST_QUEUE_SECRET}\n` },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, false); // No jobs, but auth passed
  });
});

Deno.test("llm-worker: Successful Job Processing", async (t) => {
  await t.step("submits OpenAI job to background mode (waiting_llm)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob() },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.count, 1);
    const result = firstResult(body);
    assertEquals(result.status, "waiting_llm");
    assertEquals(result.job_id, "job-123");
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
    assertEquals(body.count, 1);
    const result = firstResult(body);
    assertEquals(result.status, "completed");
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
    assertEquals(body.count, 1);
    const result = firstResult(body);
    assertEquals(result.status, "completed");
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
    const result = firstResult(body);
    assertEquals(result.status, "exhausted");
    assertExists(result.message);
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
    const result = firstResult(body);
    assertEquals(result.status, "failed");
    assertStringIncludes(result.message as string, "Unsupported provider");
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
    const result = firstResult(body);
    assertEquals(result.status, "retrying");
    assertStringIncludes(result.message as string, "retry");
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
    const result = firstResult(body);
    assertEquals(result.status, "exhausted");
    assertStringIncludes(result.message as string, "Max retries");
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
    const result = firstResult(body);
    assertEquals(result.status, "exhausted");
    assertStringIncludes(result.message as string, "Non-retryable");
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
    const result = firstResult(body);
    assertEquals(result.status, "retrying");
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
    const result = firstResult(body);
    assertEquals(result.status, "exhausted");
    assertStringIncludes(result.message as string, "Max retries");
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
  await t.step("success response includes count and results array", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertExists(body.count);
    assertExists(body.results);
    const result = firstResult(body);
    assertExists(result.job_id);
    assertExists(result.status);
  });

  await t.step("no jobs response has processed=false", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        queueMessages: [],
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
    const result = firstResult(body);
    assertEquals(result.status, "exhausted");
  });
});

// ============================================================================
// Multimodal Messages Tests
// ============================================================================

Deno.test("llm-worker: Multimodal Messages", async (t) => {
  await t.step("OpenAI: multimodal messages go to background mode", async () => {
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
    const result = firstResult(body);
    assertEquals(result.status, "waiting_llm");
  });

  await t.step("OpenAI: system_prompt + prompt constructs input for background", async () => {
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
    const result = firstResult(body);
    assertEquals(result.status, "waiting_llm");
  });
});

// ============================================================================
// Responses API Tests
// ============================================================================

Deno.test("llm-worker: Responses API Routing", async (t) => {
  await t.step("api_method='responses' goes to background mode", async () => {
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
    const result = firstResult(body);
    assertEquals(result.status, "waiting_llm");
  });

  await t.step("Responses API strips model from job.input (uses provider config)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({
            api_method: "responses",
            input: { model: "gpt-5" },
          }),
        },
        provider: { data: createMockProvider({ slug: "openai", config: { model: "gpt-4o" } }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    const result = firstResult(body);
    // Job still succeeds — model from input is stripped, provider config model is used
    assertEquals(result.status, "waiting_llm");
  });
});

// ============================================================================
// Response Processor Tests
// ============================================================================

Deno.test("llm-worker: Response Processor Integration (sync providers)", async (t) => {
  await t.step("processor success: runs processor then completes job (Anthropic)", async () => {
    let processorCalled = false;
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ feature_slug: "extract-colors" }),
        },
        provider: { data: createMockProvider({ slug: "anthropic" }) },
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
    const result = firstResult(body);
    assertEquals(result.status, "completed");
    assertEquals(processorCalled, true);
  });

  await t.step("processor failure: sets post_processing_failed status (Anthropic)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ feature_slug: "extract-colors" }),
        },
        provider: { data: createMockProvider({ slug: "anthropic" }) },
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
    const result = firstResult(body);
    assertEquals(result.status, "post_processing_failed");
    assertStringIncludes(result.message as string, "Invalid JSON");
  });

  await t.step("no processor registered: completes normally (Anthropic)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ feature_slug: "unknown-feature" }),
        },
        provider: { data: createMockProvider({ slug: "anthropic" }) },
      },
      getResponseProcessor: () => null, // No processor found
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    const result = firstResult(body);
    assertEquals(result.status, "completed");
  });

  await t.step("null feature_slug: skips processor and completes normally (Anthropic)", async () => {
    let processorQueried = false;
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ feature_slug: null }),
        },
        provider: { data: createMockProvider({ slug: "anthropic" }) },
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
    const result = firstResult(body);
    assertEquals(result.status, "completed");
    assertEquals(processorQueried, true);
  });

  await t.step("OpenAI jobs skip processor (handled by webhook)", async () => {
    let processorCalled = false;
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: {
          data: createMockJob({ feature_slug: "extract-colors" }),
        },
        provider: { data: createMockProvider({ slug: "openai" }) },
      },
      getResponseProcessor: () => {
        processorCalled = true;
        return async () => {};
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    // OpenAI goes to background — processor runs in webhook, not worker
    const result = firstResult(body);
    assertEquals(result.status, "waiting_llm");
    assertEquals(processorCalled, false);
  });
});

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

Deno.test("llm-worker: Backward Compatibility", async (t) => {
  await t.step("OpenAI chat jobs now go to background mode", async () => {
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
    const result = firstResult(body);
    assertEquals(result.status, "waiting_llm");
    assertEquals(result.job_id, "job-123");
  });

  await t.step("Anthropic jobs still process synchronously", async () => {
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
        provider: { data: createMockProvider({ slug: "anthropic" }) },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    const result = firstResult(body);
    assertEquals(result.status, "completed");
  });

  await t.step("chat with messages + response_format goes to background (OpenAI)", async () => {
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
    const result = firstResult(body);
    assertEquals(result.status, "waiting_llm");
  });
});

// ============================================================================
// Queue Message Handling Tests
// ============================================================================

Deno.test("llm-worker: Queue Message Handling", async (t) => {
  await t.step("handles queue message for non-claimable job (skipped)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        queueMessages: [createQueueMessage({ job_id: "stale-job" })],
        claimJob: { data: null }, // Job not in claimable state
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.count, 1);
    const result = firstResult(body);
    assertEquals(result.status, "skipped");
    assertEquals(result.job_id, "stale-job");
    assertStringIncludes(result.message as string, "not claimable");
  });

  await t.step("handles queue message with missing job_id", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        queueMessages: [{
          msg_id: 99,
          read_ct: 1,
          enqueued_at: new Date().toISOString(),
          vt: new Date(Date.now() + 300000).toISOString(),
          // deno-lint-ignore no-explicit-any
          message: {} as any, // No job_id
        }],
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    assertEquals(body.count, 1);
    const result = firstResult(body);
    assertEquals(result.status, "skipped");
    assertStringIncludes(result.message as string, "no job_id");
  });
});

// ============================================================================
// Background Submission Tests
// ============================================================================

Deno.test("llm-worker: Background Submission", async (t) => {
  await t.step("OpenAI background submission failure triggers retry", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ slug: "openai", max_retries: 3 }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldFail: true,
          errorMessage: "OpenAI server error",
          isRetryable: true,
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    const result = firstResult(body);
    assertEquals(result.status, "retrying");
  });

  await t.step("OpenAI background submission non-retryable failure exhausts", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ slug: "openai", max_retries: 3 }) },
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldFail: true,
          errorMessage: "Invalid API key",
          isRetryable: false,
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    const result = firstResult(body);
    assertEquals(result.status, "exhausted");
  });
});

// ============================================================================
// Status Guard Tests (C2: concurrent cancellation protection)
// ============================================================================

Deno.test("llm-worker: Status Guards", async (t) => {
  await t.step("OpenAI: skips when job cancelled before waiting_llm update", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob() },
        provider: { data: createMockProvider({ slug: "openai" }) },
        updateResult: { data: null, error: null }, // Status guard fails (job cancelled)
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    const result = firstResult(body);
    assertEquals(result.status, "skipped");
    assertStringIncludes(result.message as string, "cancelled");
  });

  await t.step("Anthropic: skips when job cancelled before completed update", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob() },
        provider: { data: createMockProvider({ slug: "anthropic" }) },
        updateResult: { data: null, error: null }, // Status guard fails (job cancelled)
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    const result = firstResult(body);
    assertEquals(result.status, "skipped");
    assertStringIncludes(result.message as string, "cancelled");
  });

  await t.step("retryable error: skips when job cancelled before retry update", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ slug: "openai", max_retries: 3 }) },
        updateResult: { data: null, error: null }, // Status guard fails
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldFail: true,
          errorMessage: "Network error",
          isRetryable: true,
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    const result = firstResult(body);
    assertEquals(result.status, "skipped");
    assertStringIncludes(result.message as string, "cancelled");
  });

  await t.step("non-retryable error: skips when job cancelled before exhausted update", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ retry_count: 0 }) },
        provider: { data: createMockProvider({ slug: "openai", max_retries: 3 }) },
        updateResult: { data: null, error: null }, // Status guard fails
      },
      llmProviderOptions: {
        openaiOptions: {
          shouldFail: true,
          errorMessage: "Invalid request",
          isRetryable: false,
        },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest();

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.processed, true);
    const result = firstResult(body);
    assertEquals(result.status, "skipped");
    assertStringIncludes(result.message as string, "cancelled");
  });
});

// ============================================================================
// Pre-Processor Status Check Tests (C3: prevent domain writes on cancelled jobs)
// ============================================================================

Deno.test("llm-worker: Pre-Processor Status Check", async (t) => {
  await t.step("skips processor when job cancelled between LLM call and processor", async () => {
    let processorCalled = false;
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ feature_slug: "extract-colors" }) },
        provider: { data: createMockProvider({ slug: "anthropic" }) },
        statusCheckResult: { data: { status: "cancelled" } }, // Job cancelled mid-flight
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
    const result = firstResult(body);
    assertEquals(result.status, "skipped");
    assertStringIncludes(result.message as string, "status changed");
    assertEquals(processorCalled, false);
  });

  await t.step("runs processor when job still running at check time", async () => {
    let processorCalled = false;
    const deps = createMockDeps({
      supabaseOptions: {
        claimJob: { data: createMockJob({ feature_slug: "extract-colors" }) },
        provider: { data: createMockProvider({ slug: "anthropic" }) },
        statusCheckResult: { data: { status: "running" } }, // Job still running
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
    const result = firstResult(body);
    assertEquals(result.status, "completed");
    assertEquals(processorCalled, true);
  });
});
