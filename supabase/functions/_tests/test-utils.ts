/**
 * Shared test utilities and mocks for LLM management Edge Functions
 *
 * This module provides mock implementations, test data factories, and utility
 * functions for testing Supabase Edge Functions in a Deno environment.
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  assertSpyCalls,
  returnsNext,
  spy,
  stub,
} from "https://deno.land/std@0.208.0/testing/mock.ts";

// Re-export assertions for convenience
export {
  assertEquals,
  assertExists,
  assertRejects,
  assertSpyCalls,
  assertThrows,
  returnsNext,
  spy,
  stub,
};

// ============================================================================
// Types
// ============================================================================

export interface MockUser {
  id: string;
  email: string;
  user_id: string;
  customer_id: string | null;
  role: {
    name: string;
    is_system_role: boolean;
  } | null;
}

export interface MockLLMJob {
  job_id: string;
  customer_id: string;
  user_id: string;
  provider: "openai" | "anthropic" | "google";
  model: string;
  prompt: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  result: string | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  external_id: string | null;
  webhook_received: boolean;
  idempotency_key: string | null;
}

export interface MockSupabaseResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export type WebhookProvider = "openai" | "anthropic" | "google";

// ============================================================================
// Test Data Factories
// ============================================================================

let idCounter = 0;

function generateId(): string {
  return `test-${++idCounter}-${Date.now()}`;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const id = generateId();
  return {
    id: `auth-${id}`,
    email: `user-${id}@example.com`,
    user_id: `user-${id}`,
    customer_id: `customer-${id}`,
    role: {
      name: "standard_user",
      is_system_role: false,
    },
    ...overrides,
  };
}

export function createSystemAdmin(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    customer_id: null,
    role: {
      name: "system_admin",
      is_system_role: true,
    },
    ...overrides,
  });
}

export function createCustomerAdmin(
  overrides: Partial<MockUser> = {}
): MockUser {
  return createMockUser({
    role: {
      name: "customer_admin",
      is_system_role: false,
    },
    ...overrides,
  });
}

export function createMockLLMJob(
  overrides: Partial<MockLLMJob> = {}
): MockLLMJob {
  const id = generateId();
  const now = new Date().toISOString();
  return {
    job_id: `job-${id}`,
    customer_id: `customer-${id}`,
    user_id: `user-${id}`,
    provider: "openai",
    model: "gpt-4",
    prompt: "Test prompt",
    status: "pending",
    result: null,
    error: null,
    retry_count: 0,
    max_retries: 3,
    created_at: now,
    updated_at: now,
    completed_at: null,
    external_id: null,
    webhook_received: false,
    idempotency_key: null,
    ...overrides,
  };
}

// ============================================================================
// Mock Request/Response Builders
// ============================================================================

export function createMockRequest(
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    url?: string;
  } = {}
): Request {
  const { method = "POST", body, headers = {}, url = "http://localhost/test" } =
    options;

  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    requestInit.body = JSON.stringify(body);
    (requestInit.headers as Headers).set("Content-Type", "application/json");
  }

  return new Request(url, requestInit);
}

export function createAuthenticatedRequest(
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    url?: string;
    token?: string;
  } = {}
): Request {
  const { token = "valid-test-token", headers = {}, ...rest } = options;

  return createMockRequest({
    ...rest,
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function parseResponse(
  response: Response
): Promise<{ status: number; data: unknown }> {
  const data = await response.json();
  return {
    status: response.status,
    data,
  };
}

// ============================================================================
// Mock Supabase Client
// ============================================================================

export interface MockSupabaseClient {
  auth: MockSupabaseAuth;
  from: (table: string) => MockSupabaseQueryBuilder;
  _calls: {
    auth: unknown[];
    queries: Array<{ table: string; operations: unknown[] }>;
  };
  _setQueryResponse: (
    table: string,
    response: MockSupabaseResponse<unknown>
  ) => void;
  _reset: () => void;
}

export interface MockSupabaseAuth {
  getUser: (token: string) => Promise<MockSupabaseResponse<{ user: unknown }>>;
  admin: {
    getUserById: (
      id: string
    ) => Promise<MockSupabaseResponse<{ user: unknown }>>;
    updateUserById: (
      id: string,
      data: unknown
    ) => Promise<MockSupabaseResponse<{ user: unknown }>>;
    createUser: (data: unknown) => Promise<MockSupabaseResponse<{ user: unknown }>>;
    deleteUser: (id: string) => Promise<MockSupabaseResponse<unknown>>;
    inviteUserByEmail: (
      email: string,
      options?: unknown
    ) => Promise<MockSupabaseResponse<unknown>>;
    listUsers: (
      options?: unknown
    ) => Promise<MockSupabaseResponse<{ users: unknown[] }>>;
  };
  _setUserResponse: (response: MockSupabaseResponse<{ user: unknown }>) => void;
}

export interface MockSupabaseQueryBuilder {
  select: (columns?: string) => MockSupabaseQueryBuilder;
  insert: (data: unknown) => MockSupabaseQueryBuilder;
  update: (data: unknown) => MockSupabaseQueryBuilder;
  delete: () => MockSupabaseQueryBuilder;
  eq: (column: string, value: unknown) => MockSupabaseQueryBuilder;
  neq: (column: string, value: unknown) => MockSupabaseQueryBuilder;
  is: (column: string, value: unknown) => MockSupabaseQueryBuilder;
  in: (column: string, values: unknown[]) => MockSupabaseQueryBuilder;
  lt: (column: string, value: unknown) => MockSupabaseQueryBuilder;
  lte: (column: string, value: unknown) => MockSupabaseQueryBuilder;
  gt: (column: string, value: unknown) => MockSupabaseQueryBuilder;
  gte: (column: string, value: unknown) => MockSupabaseQueryBuilder;
  order: (column: string, options?: unknown) => MockSupabaseQueryBuilder;
  limit: (count: number) => MockSupabaseQueryBuilder;
  single: () => Promise<MockSupabaseResponse<unknown>>;
  maybeSingle: () => Promise<MockSupabaseResponse<unknown>>;
  then: <T>(
    resolve: (value: MockSupabaseResponse<unknown>) => T
  ) => Promise<T>;
}

export function createMockSupabaseClient(): MockSupabaseClient {
  const calls: MockSupabaseClient["_calls"] = {
    auth: [],
    queries: [],
  };

  const queryResponses: Map<string, MockSupabaseResponse<unknown>> = new Map();
  let authUserResponse: MockSupabaseResponse<{ user: unknown }> = {
    data: null,
    error: null,
  };

  const createQueryBuilder = (table: string): MockSupabaseQueryBuilder => {
    const operations: unknown[] = [];
    calls.queries.push({ table, operations });

    const builder: MockSupabaseQueryBuilder = {
      select: (columns?: string) => {
        operations.push({ type: "select", columns });
        return builder;
      },
      insert: (data: unknown) => {
        operations.push({ type: "insert", data });
        return builder;
      },
      update: (data: unknown) => {
        operations.push({ type: "update", data });
        return builder;
      },
      delete: () => {
        operations.push({ type: "delete" });
        return builder;
      },
      eq: (column: string, value: unknown) => {
        operations.push({ type: "eq", column, value });
        return builder;
      },
      neq: (column: string, value: unknown) => {
        operations.push({ type: "neq", column, value });
        return builder;
      },
      is: (column: string, value: unknown) => {
        operations.push({ type: "is", column, value });
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        operations.push({ type: "in", column, values });
        return builder;
      },
      lt: (column: string, value: unknown) => {
        operations.push({ type: "lt", column, value });
        return builder;
      },
      lte: (column: string, value: unknown) => {
        operations.push({ type: "lte", column, value });
        return builder;
      },
      gt: (column: string, value: unknown) => {
        operations.push({ type: "gt", column, value });
        return builder;
      },
      gte: (column: string, value: unknown) => {
        operations.push({ type: "gte", column, value });
        return builder;
      },
      order: (column: string, options?: unknown) => {
        operations.push({ type: "order", column, options });
        return builder;
      },
      limit: (count: number) => {
        operations.push({ type: "limit", count });
        return builder;
      },
      single: async () => {
        operations.push({ type: "single" });
        return queryResponses.get(table) || { data: null, error: null };
      },
      maybeSingle: async () => {
        operations.push({ type: "maybeSingle" });
        return queryResponses.get(table) || { data: null, error: null };
      },
      then: async <T>(
        resolve: (value: MockSupabaseResponse<unknown>) => T
      ): Promise<T> => {
        const response = queryResponses.get(table) || {
          data: null,
          error: null,
        };
        return resolve(response);
      },
    };

    return builder;
  };

  const mockAuth: MockSupabaseAuth = {
    getUser: async (token: string) => {
      calls.auth.push({ type: "getUser", token });
      return authUserResponse;
    },
    admin: {
      getUserById: async (id: string) => {
        calls.auth.push({ type: "admin.getUserById", id });
        return authUserResponse;
      },
      updateUserById: async (id: string, data: unknown) => {
        calls.auth.push({ type: "admin.updateUserById", id, data });
        return authUserResponse;
      },
      createUser: async (data: unknown) => {
        calls.auth.push({ type: "admin.createUser", data });
        return authUserResponse;
      },
      deleteUser: async (id: string) => {
        calls.auth.push({ type: "admin.deleteUser", id });
        return { data: null, error: null };
      },
      inviteUserByEmail: async (email: string, options?: unknown) => {
        calls.auth.push({ type: "admin.inviteUserByEmail", email, options });
        return { data: null, error: null };
      },
      listUsers: async (options?: unknown) => {
        calls.auth.push({ type: "admin.listUsers", options });
        return { data: { users: [] }, error: null };
      },
    },
    _setUserResponse: (response: MockSupabaseResponse<{ user: unknown }>) => {
      authUserResponse = response;
    },
  };

  return {
    auth: mockAuth,
    from: createQueryBuilder,
    _calls: calls,
    _setQueryResponse: (
      table: string,
      response: MockSupabaseResponse<unknown>
    ) => {
      queryResponses.set(table, response);
    },
    _reset: () => {
      calls.auth = [];
      calls.queries = [];
      queryResponses.clear();
      authUserResponse = { data: null, error: null };
    },
  };
}

// ============================================================================
// Mock LLM Provider APIs
// ============================================================================

export interface MockLLMProviderResponse {
  success: boolean;
  data?: {
    id: string;
    choices?: Array<{ message: { content: string } }>;
    content?: Array<{ text: string }>;
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
}

export function createMockOpenAIResponse(
  content: string = "Mock OpenAI response"
): MockLLMProviderResponse {
  return {
    success: true,
    data: {
      id: `chatcmpl-${generateId()}`,
      choices: [
        {
          message: {
            content,
          },
        },
      ],
    },
  };
}

export function createMockAnthropicResponse(
  content: string = "Mock Anthropic response"
): MockLLMProviderResponse {
  return {
    success: true,
    data: {
      id: `msg-${generateId()}`,
      content: [
        {
          text: content,
        },
      ],
    },
  };
}

export function createMockGoogleResponse(
  content: string = "Mock Google response"
): MockLLMProviderResponse {
  return {
    success: true,
    data: {
      id: `gemini-${generateId()}`,
      candidates: [
        {
          content: {
            parts: [
              {
                text: content,
              },
            ],
          },
        },
      ],
    },
  };
}

export function createMockLLMError(
  message: string = "API Error",
  type: string = "api_error"
): MockLLMProviderResponse {
  return {
    success: false,
    error: {
      message,
      type,
    },
  };
}

// ============================================================================
// Mock Webhook Payloads
// ============================================================================

export interface WebhookPayload {
  provider: WebhookProvider;
  body: unknown;
  headers: Record<string, string>;
}

export function createOpenAIWebhookPayload(
  jobId: string,
  content: string = "Completed response"
): WebhookPayload {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    provider: "openai",
    body: {
      id: `chatcmpl-${generateId()}`,
      object: "chat.completion",
      created: timestamp,
      model: "gpt-4",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
      metadata: {
        job_id: jobId,
      },
    },
    headers: {
      "Content-Type": "application/json",
      "OpenAI-Organization": "test-org",
    },
  };
}

export function createAnthropicWebhookPayload(
  jobId: string,
  content: string = "Completed response"
): WebhookPayload {
  return {
    provider: "anthropic",
    body: {
      id: `msg-${generateId()}`,
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: content,
        },
      ],
      model: "claude-3-opus-20240229",
      stop_reason: "end_turn",
      usage: {
        input_tokens: 10,
        output_tokens: 20,
      },
      metadata: {
        job_id: jobId,
      },
    },
    headers: {
      "Content-Type": "application/json",
      "Anthropic-Version": "2023-06-01",
    },
  };
}

export function createGoogleWebhookPayload(
  jobId: string,
  content: string = "Completed response"
): WebhookPayload {
  return {
    provider: "google",
    body: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: content,
              },
            ],
            role: "model",
          },
          finishReason: "STOP",
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        totalTokenCount: 30,
      },
      metadata: {
        job_id: jobId,
      },
    },
    headers: {
      "Content-Type": "application/json",
    },
  };
}

// ============================================================================
// Webhook Signature Utilities
// ============================================================================

export async function generateHmacSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createSignedWebhookRequest(
  payload: WebhookPayload,
  secret: string
): Promise<Request> {
  const bodyString = JSON.stringify(payload.body);
  const signature = await generateHmacSignature(bodyString, secret);

  return createMockRequest({
    method: "POST",
    body: payload.body,
    headers: {
      ...payload.headers,
      "X-Webhook-Signature": signature,
    },
  });
}

// ============================================================================
// Environment Variable Mocking
// ============================================================================

export interface EnvMock {
  set: (key: string, value: string) => void;
  get: (key: string) => string | undefined;
  delete: (key: string) => void;
  reset: () => void;
  // deno-lint-ignore no-explicit-any
  _stub: any;
}

export function createEnvMock(
  initialEnv: Record<string, string> = {}
): EnvMock {
  const env = new Map<string, string>(Object.entries(initialEnv));
  // deno-lint-ignore no-explicit-any
  let envStub: any = null;

  const mock: EnvMock = {
    set: (key: string, value: string) => {
      env.set(key, value);
    },
    get: (key: string) => {
      return env.get(key);
    },
    delete: (key: string) => {
      env.delete(key);
    },
    reset: () => {
      env.clear();
      if (envStub) {
        envStub.restore();
        envStub = null;
      }
    },
    _stub: null,
  };

  // Create stub for Deno.env.get
  envStub = stub(Deno.env, "get", (key: string) => env.get(key));
  mock._stub = envStub;

  return mock;
}

// Default environment variables for testing
export const defaultTestEnv: Record<string, string> = {
  SUPABASE_URL: "http://localhost:54321",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  SUPABASE_ANON_KEY: "test-anon-key",
  OPENAI_API_KEY: "test-openai-key",
  ANTHROPIC_API_KEY: "test-anthropic-key",
  GOOGLE_AI_API_KEY: "test-google-key",
  LLM_WEBHOOK_SECRET: "test-webhook-secret",
  SITE_URL: "http://localhost:3000",
  LLM_RATE_LIMIT_PER_MINUTE: "60",
  LLM_RATE_LIMIT_PER_HOUR: "1000",
  LLM_MAX_RETRIES: "3",
};

// ============================================================================
// Fetch Mocking
// ============================================================================

export interface FetchMock {
  mock: (
    urlPattern: string | RegExp,
    response: Response | (() => Response | Promise<Response>)
  ) => void;
  mockOnce: (
    urlPattern: string | RegExp,
    response: Response | (() => Response | Promise<Response>)
  ) => void;
  calls: Array<{ url: string; options: RequestInit }>;
  reset: () => void;
  restore: () => void;
  // deno-lint-ignore no-explicit-any
  _stub: any;
}

export function createFetchMock(): FetchMock {
  const mocks: Map<
    string | RegExp,
    Array<Response | (() => Response | Promise<Response>)>
  > = new Map();
  const calls: Array<{ url: string; options: RequestInit }> = [];
  // deno-lint-ignore no-explicit-any
  let fetchStub: any = null;

  const mockFetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, options: init || {} });

    for (const [pattern, responses] of mocks) {
      const matches =
        typeof pattern === "string" ? url.includes(pattern) : pattern.test(url);

      if (matches && responses.length > 0) {
        const responseOrFn = responses[0];
        // Remove if it's a one-time mock
        if (responses.length === 1 && mocks.get(pattern) === responses) {
          // Keep persistent mocks, only remove single-use ones
        } else {
          responses.shift();
        }

        if (typeof responseOrFn === "function") {
          return await responseOrFn();
        }
        return responseOrFn.clone();
      }
    }

    // Default: return 404
    return new Response(JSON.stringify({ error: "Not mocked" }), {
      status: 404,
    });
  };

  fetchStub = stub(globalThis, "fetch", mockFetch);

  return {
    mock: (
      urlPattern: string | RegExp,
      response: Response | (() => Response | Promise<Response>)
    ) => {
      if (!mocks.has(urlPattern)) {
        mocks.set(urlPattern, []);
      }
      // Persistent mock - keep adding
      mocks.get(urlPattern)!.push(response);
    },
    mockOnce: (
      urlPattern: string | RegExp,
      response: Response | (() => Response | Promise<Response>)
    ) => {
      if (!mocks.has(urlPattern)) {
        mocks.set(urlPattern, []);
      }
      mocks.get(urlPattern)!.push(response);
    },
    calls,
    reset: () => {
      mocks.clear();
      calls.length = 0;
    },
    restore: () => {
      if (fetchStub) {
        fetchStub.restore();
        fetchStub = null;
      }
    },
    _stub: fetchStub,
  };
}

// ============================================================================
// Rate Limiting Test Utilities
// ============================================================================

export interface RateLimitState {
  requestCount: number;
  windowStart: number;
  isLimited: boolean;
}

export function createRateLimitTracker(
  limit: number,
  windowMs: number
): {
  track: (userId: string) => RateLimitState;
  reset: () => void;
  getState: (userId: string) => RateLimitState | undefined;
} {
  const userStates = new Map<string, RateLimitState>();

  return {
    track: (userId: string): RateLimitState => {
      const now = Date.now();
      let state = userStates.get(userId);

      if (!state || now - state.windowStart > windowMs) {
        state = {
          requestCount: 1,
          windowStart: now,
          isLimited: false,
        };
      } else {
        state.requestCount++;
        state.isLimited = state.requestCount > limit;
      }

      userStates.set(userId, state);
      return state;
    },
    reset: () => {
      userStates.clear();
    },
    getState: (userId: string) => userStates.get(userId),
  };
}

// ============================================================================
// Test Lifecycle Helpers
// ============================================================================

export interface TestContext {
  supabase: MockSupabaseClient;
  env: EnvMock;
  fetch: FetchMock;
  cleanup: () => void;
}

export function setupTestContext(
  envOverrides: Record<string, string> = {}
): TestContext {
  const supabase = createMockSupabaseClient();
  const env = createEnvMock({ ...defaultTestEnv, ...envOverrides });
  const fetchMock = createFetchMock();

  return {
    supabase,
    env,
    fetch: fetchMock,
    cleanup: () => {
      supabase._reset();
      env.reset();
      fetchMock.restore();
    },
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

export function assertResponseStatus(
  response: Response,
  expectedStatus: number,
  message?: string
): void {
  assertEquals(
    response.status,
    expectedStatus,
    message || `Expected status ${expectedStatus}, got ${response.status}`
  );
}

export async function assertResponseError(
  response: Response,
  expectedMessage: string | RegExp
): Promise<void> {
  const data = await response.json();
  assertExists(data.error, "Expected error in response");

  if (typeof expectedMessage === "string") {
    assertEquals(data.error, expectedMessage);
  } else {
    assertEquals(
      expectedMessage.test(data.error),
      true,
      `Expected error matching ${expectedMessage}, got ${data.error}`
    );
  }
}

export async function assertResponseSuccess(
  response: Response
): Promise<unknown> {
  assertEquals(
    response.ok,
    true,
    `Expected successful response, got status ${response.status}`
  );
  return await response.json();
}

// ============================================================================
// Time Utilities
// ============================================================================

export function advanceTime(ms: number): void {
  // This is a placeholder - in real tests you'd use FakeTime from std/testing
  // For now, we document the pattern
}

export function freezeTime(timestamp?: number): () => void {
  // This is a placeholder - in real tests you'd use FakeTime from std/testing
  // Returns a cleanup function
  return () => {};
}

// ============================================================================
// Job State Assertions
// ============================================================================

export function assertJobStatus(
  job: MockLLMJob,
  expectedStatus: MockLLMJob["status"]
): void {
  assertEquals(
    job.status,
    expectedStatus,
    `Expected job status ${expectedStatus}, got ${job.status}`
  );
}

export function assertJobCompleted(job: MockLLMJob): void {
  assertJobStatus(job, "completed");
  assertExists(job.result, "Expected completed job to have result");
  assertExists(job.completed_at, "Expected completed job to have completed_at");
}

export function assertJobFailed(
  job: MockLLMJob,
  expectedError?: string | RegExp
): void {
  assertJobStatus(job, "failed");
  assertExists(job.error, "Expected failed job to have error");

  if (expectedError) {
    if (typeof expectedError === "string") {
      assertEquals(job.error, expectedError);
    } else {
      assertEquals(
        expectedError.test(job.error || ""),
        true,
        `Expected error matching ${expectedError}, got ${job.error}`
      );
    }
  }
}
