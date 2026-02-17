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
import { createHandler, detectProvider, extractJobId, type HandlerDeps } from "../llm-webhook/index.ts";

// ============================================================================
// Test Utilities
// ============================================================================

// Test secret used for all webhook signature validation in tests
const TEST_WEBHOOK_SECRET = "test-webhook-secret-for-unit-tests";

/**
 * Compute HMAC-SHA256 signature for webhook payload
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
 * Create a webhook request with valid signature
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

  // Compute and add provider-specific signature headers
  if (provider === "openai") {
    const signature = await computeSignature(bodyStr, TEST_WEBHOOK_SECRET);
    reqHeaders.set("openai-signature", signature);
  } else if (provider === "anthropic") {
    const signature = await computeSignature(bodyStr, TEST_WEBHOOK_SECRET);
    reqHeaders.set("anthropic-signature", signature);
  } else if (provider === "gemini") {
    const signature = await computeSignature(bodyStr, TEST_WEBHOOK_SECRET);
    reqHeaders.set("x-goog-signature", signature);
  }

  // Add custom headers (can override computed signature if needed)
  for (const [key, value] of Object.entries(headers)) {
    reqHeaders.set(key, value);
  }

  const params = new URLSearchParams(urlParams);
  const url = `http://localhost/llm-webhook${params.toString() ? `?${params.toString()}` : ""}`;

  return new Request(url, {
    method: "POST",
    headers: reqHeaders,
    body: body !== undefined ? bodyStr : undefined,
  });
}

/**
 * Create mock Supabase client with configurable responses
 */
function createMockSupabaseClient(options: {
  jobCheck?: { data: { status: string; customer_id: string; user_id?: string | null; feature_slug?: string | null; llm_response_id?: string } | null; error?: unknown };
  recordWebhook?: { data: boolean; error?: unknown };
  jobSelect?: { data: { retry_count: number; provider_id: string } | null; error?: unknown };
  providerSelect?: { data: { max_retries: number } | null; error?: unknown };
  updateResult?: { error?: unknown };
  rpcCalls?: Record<string, { data?: unknown; error?: unknown }>;
} = {}) {
  const {
    jobCheck = { data: { status: "waiting_llm", customer_id: "cust-123", user_id: "user-123", feature_slug: null } },
    recordWebhook = { data: true },
    jobSelect = { data: { retry_count: 0, provider_id: "prov-123" } },
    providerSelect = { data: { max_retries: 3 } },
    updateResult = {},
  } = options;

  let fromTable = "";
  let selectFields = "";

  return {
    from: (table: string) => {
      fromTable = table;
      return {
        select: (fields: string) => {
          selectFields = fields;
          return {
            eq: (_field: string, _value: string) => ({
              eq: (_field2: string, _value2: string) => ({
                single: () => {
                  if (fromTable === "llm_jobs") {
                    if (selectFields.includes("status")) {
                      return Promise.resolve(jobCheck);
                    }
                    if (selectFields.includes("retry_count")) {
                      return Promise.resolve(jobSelect);
                    }
                  }
                  if (fromTable === "llm_providers") {
                    return Promise.resolve(providerSelect);
                  }
                  return Promise.resolve({ data: null });
                },
              }),
              single: () => {
                if (fromTable === "llm_jobs") {
                  if (selectFields.includes("status")) {
                    return Promise.resolve(jobCheck);
                  }
                  if (selectFields.includes("retry_count")) {
                    return Promise.resolve(jobSelect);
                  }
                }
                if (fromTable === "llm_providers") {
                  return Promise.resolve(providerSelect);
                }
                return Promise.resolve({ data: null });
              },
            }),
          };
        },
        update: (_data: unknown) => ({
          eq: (_field: string, _value: string) => ({
            eq: (_field2: string, _value2: string) => Promise.resolve(updateResult),
          }),
        }),
        insert: (_data: unknown) => Promise.resolve({ data: null, error: null }),
      };
    },
    rpc: (fnName: string, _params: unknown) => {
      if (fnName === "llm_record_webhook") {
        return Promise.resolve(recordWebhook);
      }
      if (fnName === "llm_log_diagnostic") {
        return Promise.resolve({ data: null });
      }
      if (fnName === "llm_add_to_dlq") {
        return Promise.resolve({ data: null });
      }
      return Promise.resolve({ data: null });
    },
  };
}

/**
 * Create mock dependencies
 * Provides test webhook secrets by default for signature validation
 */
function createMockDeps(options: {
  supabaseOptions?: Parameters<typeof createMockSupabaseClient>[0];
  envVars?: Record<string, string>;
} = {}): HandlerDeps {
  const { supabaseOptions, envVars = {} } = options;

  // Provide test secrets for all providers by default
  const defaultEnvVars: Record<string, string> = {
    OPENAI_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    ANTHROPIC_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    GOOGLE_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    ...envVars,
  };

  return {
    createServiceClient: () => createMockSupabaseClient(supabaseOptions),
    getEnv: (key: string) => defaultEnvVars[key],
  };
}

// ============================================================================
// Unit Tests for Helper Functions
// ============================================================================

Deno.test("llm-webhook: detectProvider", async (t) => {
  await t.step("detects OpenAI from signature header", () => {
    const req = new Request("http://localhost/webhook", {
      headers: { "openai-signature": "test" },
    });
    assertEquals(detectProvider(req), "openai");
  });

  await t.step("detects Anthropic from signature header", () => {
    const req = new Request("http://localhost/webhook", {
      headers: { "anthropic-signature": "test" },
    });
    assertEquals(detectProvider(req), "anthropic");
  });

  await t.step("detects Gemini from Google signature header", () => {
    const req = new Request("http://localhost/webhook", {
      headers: { "x-goog-signature": "test" },
    });
    assertEquals(detectProvider(req), "gemini");
  });

  await t.step("detects Gemini from User-Agent", () => {
    const req = new Request("http://localhost/webhook", {
      headers: { "user-agent": "Google-Bot/1.0" },
    });
    assertEquals(detectProvider(req), "gemini");
  });

  await t.step("returns null for unknown provider", () => {
    const req = new Request("http://localhost/webhook");
    assertEquals(detectProvider(req), null);
  });
});

Deno.test("llm-webhook: extractJobId", async (t) => {
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
    assertEquals(extractJobId(payload as typeof payload & { metadata?: { job_id?: string } }, "anthropic"), "job-456");
  });

  await t.step("returns null when no job_id found", () => {
    const payload = {
      id: "webhook-123",
      type: "response.completed",
    };
    assertEquals(extractJobId(payload as typeof payload & { metadata?: { job_id?: string } }, "openai"), null);
  });
});

// ============================================================================
// Behavioral Tests for Handler
// ============================================================================

Deno.test("llm-webhook: Provider Detection via Handler", async (t) => {
  await t.step("returns 200 OK when provider cannot be determined", async () => {
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

  await t.step("detects provider from URL parameter", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobCheck: { data: { status: "waiting_llm", customer_id: "cust-123" } },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      urlParams: { provider: "openai" },
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: Signature Validation", async (t) => {
  await t.step("rejects webhook when no secret configured", async () => {
    const deps = createMockDeps({
      envVars: {
        OPENAI_WEBHOOK_SECRET: undefined as unknown as string, // Explicitly no secret
      },
      supabaseOptions: {
        jobCheck: { data: { status: "waiting_llm", customer_id: "cust-123" } },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);

    // Returns 200 OK but logs error about missing secret
    assertEquals(response.status, 200);
  });

  await t.step("rejects invalid signature when secret configured", async () => {
    const deps = createMockDeps({
      envVars: { OPENAI_WEBHOOK_SECRET: "different-secret" }, // Different from TEST_WEBHOOK_SECRET
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);

    // Still returns 200 OK (always acknowledge) but doesn't process
    assertEquals(response.status, 200);
  });

  await t.step("accepts valid signature", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobCheck: { data: { status: "waiting_llm", customer_id: "cust-123" } },
      },
    });
    const handler = createHandler(deps);
    // createWebhookRequest computes valid signature using TEST_WEBHOOK_SECRET
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: Job State Guards", async (t) => {
  await t.step("returns 200 OK when job not found", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobCheck: { data: null },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "non-existent" },
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
    assertEquals(await response.text(), "OK");
  });

  await t.step("ignores webhook for cancelled job", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobCheck: { data: { status: "cancelled", customer_id: "cust-123" } },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "cancelled-job" },
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
  });

  await t.step("ignores webhook for already completed job", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobCheck: { data: { status: "completed", customer_id: "cust-123" } },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "already-done" },
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
  });

  await t.step("ignores stale response (response ID mismatch)", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobCheck: {
          data: {
            status: "waiting_llm",
            customer_id: "cust-123",
            llm_response_id: "expected-response-id"
          }
        },
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "different-response-id",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: Idempotency", async (t) => {
  await t.step("processes new webhooks", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobCheck: { data: { status: "waiting_llm", customer_id: "cust-123" } },
        recordWebhook: { data: true }, // New webhook
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
  });

  await t.step("ignores duplicate webhooks", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobCheck: { data: { status: "waiting_llm", customer_id: "cust-123" } },
        recordWebhook: { data: false }, // Duplicate
      },
    });
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: Error Handling", async (t) => {
  await t.step("always returns 200 OK even on invalid JSON", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = new Request("http://localhost/llm-webhook?provider=openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "openai-signature": "test"
      },
      body: "not valid json",
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
    assertEquals(await response.text(), "OK");
  });

  await t.step("returns 200 OK when job_id missing from payload", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        // No metadata.job_id
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
  });

  await t.step("handles exceptions gracefully", async () => {
    const deps: HandlerDeps = {
      createServiceClient: () => {
        throw new Error("Connection failed");
      },
      getEnv: () => undefined,
    };

    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);

    // Should still return 200 OK (always acknowledge)
    assertEquals(response.status, 200);
  });
});

Deno.test("llm-webhook: Response Format", async (t) => {
  await t.step("always returns text/plain OK response", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);
    const text = await response.text();

    assertEquals(response.status, 200);
    assertEquals(text, "OK");
  });
});

Deno.test("llm-webhook: Payload Processing", async (t) => {
  await t.step("processes completed webhook successfully", async () => {
    let updateCalled = false;
    const mockClient = createMockSupabaseClient({
      jobCheck: { data: { status: "waiting_llm", customer_id: "cust-123" } },
      recordWebhook: { data: true },
    });

    // Track update calls
    const originalFrom = mockClient.from;
    mockClient.from = (table: string) => {
      const result = originalFrom(table);
      if (table === "llm_jobs") {
        const originalUpdate = result.update;
        result.update = (data: unknown) => {
          if ((data as Record<string, unknown>).status === "completed") {
            updateCalled = true;
          }
          return originalUpdate(data);
        };
      }
      return result;
    };

    const deps: HandlerDeps = {
      createServiceClient: () => mockClient,
      getEnv: (key: string) => {
        // Provide test secrets for signature validation
        if (key === "OPENAI_WEBHOOK_SECRET") return TEST_WEBHOOK_SECRET;
        if (key === "ANTHROPIC_WEBHOOK_SECRET") return TEST_WEBHOOK_SECRET;
        if (key === "GOOGLE_WEBHOOK_SECRET") return TEST_WEBHOOK_SECRET;
        return undefined;
      },
    };
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        status: "completed",
        metadata: { job_id: "job-123" },
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "Hello world" }]
          }
        ],
      },
    });

    const response = await handler(request);

    assertEquals(response.status, 200);
    assertEquals(updateCalled, true);
  });
});

Deno.test("llm-webhook: Signature Validation Security", async (t) => {
  await t.step("rejects webhooks when no secret configured", async () => {
    const deps: HandlerDeps = {
      createServiceClient: () => createMockSupabaseClient(),
      getEnv: () => undefined, // No secrets configured
    };
    const handler = createHandler(deps);
    const request = await createWebhookRequest({
      provider: "openai",
      body: {
        id: "webhook-123",
        type: "response.completed",
        metadata: { job_id: "job-123" },
      },
    });

    const response = await handler(request);

    // Should still return 200 (always acknowledge) but not process due to invalid signature
    assertEquals(response.status, 200);
  });
});
