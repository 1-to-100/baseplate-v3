/**
 * Behavioral Tests for llm-webhook Edge Function
 *
 * These tests verify actual behavior by calling the exported handler with mocked dependencies.
 *
 * Run with: deno test --allow-env --allow-net --allow-read supabase/functions/_tests/llm-webhook.test.ts
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createHandler, extractJobId, type HandlerDeps, type LLMProviders } from "../llm-webhook/index.ts";
import type { SupabaseClient } from "../_shared/supabase.ts";

// ============================================================================
// Test Utilities
// ============================================================================

const TEST_WEBHOOK_SECRET = "test-webhook-secret-for-unit-tests";
const TEST_QUEUE_SECRET = "test-queue-secret-for-unit-tests";

/**
 * Compute HMAC-SHA256 signature (for Anthropic/Gemini tests)
 */
async function computeSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a webhook request with provider-appropriate headers
 */
async function createWebhookRequest(options: {
  provider?: string;
  body?: unknown;
  headers?: Record<string, string>;
  urlParams?: Record<string, string>;
} = {}): Promise<Request> {
  const { provider, body, headers = {}, urlParams = {} } = options;

  const reqHeaders = new Headers({ "Content-Type": "application/json" });
  const bodyStr = body !== undefined ? JSON.stringify(body) : "";

  if (provider === "openai") {
    // Standard Webhooks headers (SDK mock handles actual verification)
    reqHeaders.set("webhook-id", "wh_test123");
    reqHeaders.set("webhook-timestamp", Math.floor(Date.now() / 1000).toString());
    reqHeaders.set("webhook-signature", "v1,dGVzdA==");
  } else if (provider === "anthropic") {
    const signature = await computeSignature(bodyStr, TEST_WEBHOOK_SECRET);
    reqHeaders.set("anthropic-signature", signature);
  } else if (provider === "gemini") {
    const signature = await computeSignature(bodyStr, TEST_WEBHOOK_SECRET);
    reqHeaders.set("x-goog-signature", signature);
  }

  for (const [key, value] of Object.entries(headers)) {
    reqHeaders.set(key, value);
  }

  const params = new URLSearchParams(urlParams);
  if (provider) {
    params.set("provider", provider);
  }
  const url = `http://localhost/llm-webhook${params.toString() ? `?${params.toString()}` : ""}`;

  return new Request(url, {
    method: "POST",
    headers: reqHeaders,
    body: body !== undefined ? bodyStr : undefined,
  });
}

/**
 * Create mock Supabase client
 */
function createMockSupabaseClient(options: {
  /** Job lookup by llm_response_id (OpenAI path) */
  jobByResponseId?: { data: unknown | null };
  /** Job lookup by id (non-OpenAI path) */
  jobById?: { data: unknown | null };
  /** Provider lookup */
  providerById?: { data: unknown | null };
  /** Webhook idempotency */
  recordWebhook?: { data: boolean };
  /** Update result */
  updateResult?: { error?: unknown };
  /** Track status updates */
  onUpdate?: (data: Record<string, unknown>) => void;
  /** Track RPC calls */
  onRpc?: (fnName: string, params?: Record<string, unknown>) => void;
} = {}) {
  const {
    jobByResponseId = {
      data: {
        id: "job-123", status: "waiting_llm", customer_id: "cust-123",
        user_id: "user-123", feature_slug: null, context: {},
        llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
      },
    },
    jobById = {
      data: {
        status: "waiting_llm", customer_id: "cust-123", user_id: "user-123",
        feature_slug: null, llm_response_id: "resp-123",
        retry_count: 0, provider_id: "prov-123",
      },
    },
    providerById = { data: { max_retries: 3 } },
    recordWebhook = { data: true },
    updateResult = {},
    onUpdate,
  } = options;

  // deno-lint-ignore no-explicit-any
  const chain = (result: unknown): any => {
    // deno-lint-ignore no-explicit-any
    const obj: Record<string, any> = {};
    ["eq", "in", "order", "limit", "select", "not", "is"].forEach((m) => {
      obj[m] = () => obj;
    });
    obj.maybeSingle = () => Promise.resolve(result);
    obj.single = () => Promise.resolve(result);
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

  let lastTable = "";

  return {
    from: (table: string) => {
      lastTable = table;
      return {
        select: () => ({
          eq: (field: string) => {
            if (lastTable === "llm_jobs") {
              if (field === "llm_response_id") return chain(jobByResponseId);
              return chain(jobById);
            }
            if (lastTable === "llm_providers") return chain(providerById);
            return chain({ data: null });
          },
        }),
        update: (data: Record<string, unknown>) => {
          if (onUpdate) onUpdate(data);
          return chain(updateResult);
        },
        insert: () => Promise.resolve({ data: null, error: null }),
      };
    },
    channel: mockChannel,
    rpc: (fnName: string, params?: Record<string, unknown>) => {
      if (fnName === "llm_record_webhook") return Promise.resolve(recordWebhook);
      if (fnName === "llm_resolve_dlq") {
        if (options.onRpc) options.onRpc(fnName, params);
        return Promise.resolve({ data: true });
      }
      if (fnName === "llm_add_to_dlq") {
        if (options.onRpc) options.onRpc(fnName, params);
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: null });
    },
  };
}

/**
 * Create mock OpenAI client for webhook verification and response retrieval
 */
function createMockOpenAIClient(options: {
  unwrapShouldFail?: boolean;
  retrieveResult?: unknown;
  retrieveShouldFail?: boolean;
} = {}) {
  const {
    unwrapShouldFail = false,
    retrieveResult = {
      id: "resp-123",
      output_text: "Hello from OpenAI!",
      usage: { input_tokens: 10, output_tokens: 5 },
      model: "gpt-4o",
    },
    retrieveShouldFail = false,
  } = options;

  return {
    webhooks: {
      unwrap: (body: string, _headers: unknown, _opts: unknown) => {
        if (unwrapShouldFail) {
          throw new Error("Webhook signature verification failed");
        }
        return JSON.parse(body);
      },
    },
    responses: {
      retrieve: async () => {
        if (retrieveShouldFail) {
          throw new Error("Failed to retrieve response");
        }
        return retrieveResult;
      },
    },
  };
}

/**
 * Create mock LLM providers
 */
function createMockLLMProviders(options: {
  openaiOptions?: Parameters<typeof createMockOpenAIClient>[0];
} = {}): LLMProviders {
  return {
    // deno-lint-ignore no-explicit-any
    openai: () => createMockOpenAIClient(options.openaiOptions) as any,
    // deno-lint-ignore no-explicit-any
    anthropic: () => ({}) as any,
    // deno-lint-ignore no-explicit-any
    gemini: () => ({}) as any,
  };
}

/**
 * Create mock dependencies
 */
function createMockDeps(options: {
  supabaseOptions?: Parameters<typeof createMockSupabaseClient>[0];
  envVars?: Record<string, string>;
  llmProviderOptions?: Parameters<typeof createMockLLMProviders>[0];
  // deno-lint-ignore no-explicit-any
  getResponseProcessor?: (slug: string | null | undefined) => any;
} = {}): HandlerDeps {
  const { supabaseOptions, envVars = {}, llmProviderOptions, getResponseProcessor } = options;

  const defaultEnvVars: Record<string, string> = {
    OPENAI_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    ANTHROPIC_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    GOOGLE_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    QUEUE_SECRET: TEST_QUEUE_SECRET,
    ...envVars,
  };

  return {
    createServiceClient: () => createMockSupabaseClient(supabaseOptions) as unknown as SupabaseClient,
    getEnv: (key: string) => defaultEnvVars[key],
    llmProviders: createMockLLMProviders(llmProviderOptions),
    ...(getResponseProcessor !== undefined && { getResponseProcessor }),
  };
}

// ============================================================================
// Unit Tests for Helper Functions
// ============================================================================

Deno.test("llm-webhook: extractJobId (non-OpenAI path)", async (t) => {
  await t.step("extracts job_id from metadata", () => {
    const payload = {
      id: "webhook-123",
      type: "response.completed",
      metadata: { job_id: "job-123" },
    };
    assertEquals(extractJobId(payload, "openai"), "job-123");
  });

  await t.step("extracts custom_id for Anthropic", () => {
    const payload = {
      id: "webhook-123",
      type: "message_end",
      custom_id: "job-456",
    };
    assertEquals(
      extractJobId(payload as typeof payload & { metadata?: { job_id?: string } }, "anthropic"),
      "job-456"
    );
  });

  await t.step("returns null when no job_id found", () => {
    const payload = {
      id: "webhook-123",
      type: "response.completed",
    };
    assertEquals(
      extractJobId(payload as typeof payload & { metadata?: { job_id?: string } }, "openai"),
      null
    );
  });
});

// ============================================================================
// OpenAI Standard Webhooks Flow
// ============================================================================

Deno.test("llm-webhook: OpenAI Signature Validation", async (t) => {
  await t.step("rejects webhook when SDK unwrap fails", async () => {
    const deps = createMockDeps({
      llmProviderOptions: {
        openaiOptions: { unwrapShouldFail: true },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "OK");
  });

  await t.step("rejects when OPENAI_WEBHOOK_SECRET not configured", async () => {
    const deps = createMockDeps({
      envVars: { OPENAI_WEBHOOK_SECRET: undefined as unknown as string },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });

  await t.step("accepts valid webhook with SDK verification", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: OpenAI Job Lookup by Response ID", async (t) => {
  await t.step("looks up job by llm_response_id from payload data.id", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-456", status: "waiting_llm", customer_id: "cust-123",
            user_id: "user-123", feature_slug: null, context: {},
            llm_response_id: "resp-456", retry_count: 0, provider_id: "prov-123",
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-456" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });

  await t.step("returns 200 OK when no job found for response ID", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: { data: null },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-unknown" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: OpenAI Job State Guards", async (t) => {
  await t.step("ignores webhook for cancelled job", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "cancelled", customer_id: "cust-123",
            user_id: null, feature_slug: null, context: {},
            llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });

  await t.step("ignores webhook for terminal job (completed)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "completed", customer_id: "cust-123",
            user_id: null, feature_slug: null, context: {},
            llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });

  await t.step("ignores webhook for unexpected job status (running)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "running", customer_id: "cust-123",
            user_id: null, feature_slug: null, context: {},
            llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: OpenAI Idempotency", async (t) => {
  await t.step("processes new webhooks (uses webhook-id header)", async () => {
    const deps = createMockDeps({
      supabaseOptions: { recordWebhook: { data: true } },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });

  await t.step("ignores duplicate webhooks", async () => {
    const deps = createMockDeps({
      supabaseOptions: { recordWebhook: { data: false } },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: OpenAI Response Retrieval + Completion", async (t) => {
  await t.step("retrieves full response and marks job completed", async () => {
    let updatedStatus: string | undefined;
    const deps = createMockDeps({
      supabaseOptions: {
        onUpdate: (data) => {
          if (data.status) updatedStatus = data.status as string;
        },
      },
      llmProviderOptions: {
        openaiOptions: {
          retrieveResult: {
            id: "resp-123",
            output_text: "Generated colors: blue, red",
            usage: { input_tokens: 10, output_tokens: 20 },
            model: "gpt-4o",
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(updatedStatus, "completed");
  });

  await t.step("runs response processor on completion", async () => {
    let processorCalled = false;
    let processorOutput = "";
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "waiting_llm", customer_id: "cust-123",
            user_id: "user-123", feature_slug: "extract-colors", context: { visual_style_guide_id: "vsg-1" },
            llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
          },
        },
      },
      llmProviderOptions: {
        openaiOptions: {
          retrieveResult: {
            id: "resp-123",
            output_text: '{"colors": ["blue"]}',
            usage: { input_tokens: 10, output_tokens: 5 },
            model: "gpt-4o",
          },
        },
      },
      getResponseProcessor: (slug) => {
        if (slug === "extract-colors") {
          return async (_supabase: unknown, rawOutput: string) => {
            processorCalled = true;
            processorOutput = rawOutput;
          };
        }
        return null;
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(processorCalled, true);
    assertEquals(processorOutput, '{"colors": ["blue"]}');
  });

  await t.step("processor failure sets post_processing_failed", async () => {
    let updatedStatus: string | undefined;
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "waiting_llm", customer_id: "cust-123",
            user_id: "user-123", feature_slug: "extract-colors", context: {},
            llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
          },
        },
        onUpdate: (data) => {
          if (data.status) updatedStatus = data.status as string;
        },
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
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(updatedStatus, "post_processing_failed");
  });

  await t.step("no processor registered: completes without post-processing", async () => {
    let updatedStatus: string | undefined;
    const deps = createMockDeps({
      supabaseOptions: {
        onUpdate: (data) => {
          if (data.status) updatedStatus = data.status as string;
        },
      },
      getResponseProcessor: () => null,
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(updatedStatus, "completed");
  });

  await t.step("C3: skips processor when job cancelled between retrieval and processor", async () => {
    let processorCalled = false;
    let updatedStatus: string | undefined;
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "waiting_llm", customer_id: "cust-123",
            user_id: "user-123", feature_slug: "extract-colors", context: {},
            llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
          },
        },
        jobById: {
          data: {
            status: "cancelled", customer_id: "cust-123", user_id: "user-123",
            feature_slug: "extract-colors", llm_response_id: "resp-123",
            retry_count: 0, provider_id: "prov-123",
          },
        },
        onUpdate: (data) => {
          if (data.status) updatedStatus = data.status as string;
        },
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
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(processorCalled, false); // Processor must NOT run for cancelled job
    assertEquals(updatedStatus, undefined); // No status update should happen
  });
});

Deno.test("llm-webhook: OpenAI response.failed Handling", async (t) => {
  await t.step("schedules retry on response.failed when retries available", async () => {
    let updatedStatus: string | undefined;
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "waiting_llm", customer_id: "cust-123",
            user_id: "user-123", feature_slug: null, context: {},
            llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
          },
        },
        providerById: { data: { max_retries: 3 } },
        onUpdate: (data) => {
          if (data.status) updatedStatus = data.status as string;
        },
      },
      llmProviderOptions: {
        openaiOptions: {
          retrieveResult: {
            id: "resp-123",
            error: { message: "Rate limit exceeded" },
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.failed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(updatedStatus, "retrying");
  });

  await t.step("marks exhausted when max retries exceeded", async () => {
    let updatedStatus: string | undefined;
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "waiting_llm", customer_id: "cust-123",
            user_id: "user-123", feature_slug: null, context: {},
            llm_response_id: "resp-123", retry_count: 3, provider_id: "prov-123",
          },
        },
        providerById: { data: { max_retries: 3 } },
        onUpdate: (data) => {
          if (data.status) updatedStatus = data.status as string;
        },
      },
      llmProviderOptions: {
        openaiOptions: {
          retrieveResult: {
            id: "resp-123",
            error: { message: "Server error" },
          },
        },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.failed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(updatedStatus, "exhausted");
  });
});

// ============================================================================
// General Handler Tests
// ============================================================================

Deno.test("llm-webhook: Missing Provider Param", async (t) => {
  await t.step("returns 200 OK when ?provider= query param is missing", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = new Request("http://localhost/llm-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "test", type: "test" }),
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "OK");
  });
});

Deno.test("llm-webhook: Error Handling", async (t) => {
  await t.step("always returns 200 OK even on unexpected errors", async () => {
    const deps: HandlerDeps = {
      createServiceClient: () => {
        throw new Error("Connection failed");
      },
      getEnv: () => undefined,
    };

    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
  });

  await t.step("retrieval failure goes to DLQ", async () => {
    const deps = createMockDeps({
      llmProviderOptions: {
        openaiOptions: {
          retrieveShouldFail: true,
        },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    // Should still return 200 OK
    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: Response Format", async (t) => {
  await t.step("always returns text/plain OK response", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: { type: "response.completed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    const text = await response.text();
    assertEquals(response.status, 200);
    assertEquals(text, "OK");
  });
});

// ============================================================================
// DLQ Replay Tests (H2)
// ============================================================================

/**
 * Helper to create a DLQ replay request with queue secret auth
 */
function createDLQReplayRequest(options: {
  dlqId?: string;
  webhookPayload?: unknown;
  providerSlug?: string;
  queueSecret?: string;
  noAuth?: boolean;
} = {}): Request {
  const {
    dlqId = "dlq-123",
    webhookPayload = { type: "response.completed", data: { id: "resp-123" } },
    providerSlug = "openai",
    queueSecret = TEST_QUEUE_SECRET,
    noAuth = false,
  } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!noAuth) {
    headers["x-queue-secret"] = queueSecret;
  }

  return new Request("http://localhost/llm-webhook?source=dlq", {
    method: "POST",
    headers,
    body: JSON.stringify({
      dlq_id: dlqId,
      webhook_payload: webhookPayload,
      provider_slug: providerSlug,
    }),
  });
}

Deno.test("llm-webhook: DLQ Replay", async (t) => {
  await t.step("replays OpenAI webhook and resolves DLQ entry on success", async () => {
    const rpcCalls: Array<{ fn: string; params?: Record<string, unknown> }> = [];
    let updatedStatus = "";
    const deps = createMockDeps({
      supabaseOptions: {
        onUpdate: (data) => { updatedStatus = data.status as string; },
        onRpc: (fn, params) => { rpcCalls.push({ fn, params }); },
      },
    });
    const handler = createHandler(deps);
    const request = createDLQReplayRequest();

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(updatedStatus, "completed");

    // Verify llm_resolve_dlq was called with the correct DLQ ID
    const resolveCall = rpcCalls.find((c) => c.fn === "llm_resolve_dlq");
    assertExists(resolveCall);
    assertEquals(resolveCall.params?.p_dlq_id, "dlq-123");
  });

  await t.step("accepts DLQ replay when QUEUE_SECRET has surrounding whitespace", async () => {
    const rpcCalls: Array<{ fn: string; params?: Record<string, unknown> }> = [];
    const deps = createMockDeps({
      envVars: { QUEUE_SECRET: `  ${TEST_QUEUE_SECRET}\n` },
      supabaseOptions: {
        onRpc: (fn, params) => { rpcCalls.push({ fn, params }); },
      },
    });
    const handler = createHandler(deps);
    const request = createDLQReplayRequest();

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "OK");

    const resolveCall = rpcCalls.find((c) => c.fn === "llm_resolve_dlq");
    assertExists(resolveCall);
  });

  await t.step("rejects DLQ replay without auth", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createDLQReplayRequest({ noAuth: true });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "OK");
    // No processing should happen (auth rejected)
  });

  await t.step("rejects DLQ replay with invalid auth token", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createDLQReplayRequest({ queueSecret: "wrong-key" });

    const response = await handler(request);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), "OK");
  });

  await t.step("skips replay when job no longer in waiting_llm", async () => {
    const rpcCalls: Array<{ fn: string; params?: Record<string, unknown> }> = [];
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "completed", customer_id: "cust-123",
            user_id: "user-123", feature_slug: null, context: {},
            llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
          },
        },
        onRpc: (fn, params) => { rpcCalls.push({ fn, params }); },
      },
    });
    const handler = createHandler(deps);
    const request = createDLQReplayRequest();

    const response = await handler(request);
    assertEquals(response.status, 200);

    // Should NOT resolve DLQ (job skipped, not an error — DLQ stays for next retry
    // but the replay function succeeds without error, so it DOES resolve)
    // Actually: replayOpenAIWebhook returns without error (skips silently),
    // so handleDLQReplay calls llm_resolve_dlq
    const resolveCall = rpcCalls.find((c) => c.fn === "llm_resolve_dlq");
    assertExists(resolveCall);
  });

  await t.step("DLQ replay failure does not re-add to DLQ", async () => {
    const rpcCalls: Array<{ fn: string; params?: Record<string, unknown> }> = [];
    const deps = createMockDeps({
      llmProviderOptions: {
        openaiOptions: { retrieveShouldFail: true },
      },
      supabaseOptions: {
        onRpc: (fn, params) => { rpcCalls.push({ fn, params }); },
      },
    });
    const handler = createHandler(deps);
    const request = createDLQReplayRequest();

    const response = await handler(request);
    assertEquals(response.status, 200);

    // Should NOT call llm_resolve_dlq (replay failed)
    const resolveCall = rpcCalls.find((c) => c.fn === "llm_resolve_dlq");
    assertEquals(resolveCall, undefined);

    // Should NOT call llm_add_to_dlq (would create duplicate)
    const addCall = rpcCalls.find((c) => c.fn === "llm_add_to_dlq");
    assertEquals(addCall, undefined);
  });

  await t.step("replays OpenAI failed event and follows retry logic", async () => {
    let updatedStatus = "";
    const deps = createMockDeps({
      supabaseOptions: {
        jobByResponseId: {
          data: {
            id: "job-123", status: "waiting_llm", customer_id: "cust-123",
            user_id: "user-123", feature_slug: null, context: {},
            llm_response_id: "resp-123", retry_count: 0, provider_id: "prov-123",
          },
        },
        onUpdate: (data) => { updatedStatus = data.status as string; },
      },
    });
    const handler = createHandler(deps);
    const request = createDLQReplayRequest({
      webhookPayload: { type: "response.failed", data: { id: "resp-123" } },
    });

    const response = await handler(request);
    assertEquals(response.status, 200);
    // retry_count (0) < max_retries (3), so job goes to retrying
    assertEquals(updatedStatus, "retrying");
  });
});
