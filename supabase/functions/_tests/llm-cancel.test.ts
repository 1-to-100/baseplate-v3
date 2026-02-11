/**
 * Behavioral Tests for llm-cancel Edge Function
 *
 * These tests verify actual behavior by calling the exported handler with mocked dependencies.
 *
 * Run with: deno test --allow-env --allow-net --allow-read supabase/functions/_tests/llm-cancel.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createHandler, type HandlerDeps } from "../llm-cancel/index.ts";
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

  return new Request("http://localhost/llm-cancel", {
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
 * Note: With RLS, the client only returns jobs the user has access to.
 * A null jobData simulates "job not found OR no access" (indistinguishable to user).
 */
function createMockSupabaseClient(options: {
  // Job lookup response (RLS filters to only accessible jobs)
  jobData?: { status: string } | null;
  jobError?: { message: string } | null;
  // Update response
  updateData?: { id: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const {
    jobData = { status: "processing" },
    jobError = null,
    updateData = { id: "job-123" },
    updateError = null,
  } = options;

  return {
    from: (_table: string) => ({
      select: (_fields: string) => ({
        eq: (_field: string, _value: unknown) => ({
          single: () => Promise.resolve({ data: jobData, error: jobError }),
        }),
      }),
      update: (_data: unknown) => ({
        eq: (_field: string, _value: unknown) => ({
          not: (_field2: string, _op: string, _value2: unknown) => ({
            select: (_fields: string) => ({
              single: () => Promise.resolve({ data: updateData, error: updateError }),
            }),
          }),
        }),
      }),
    }),
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
      if (!user) throw new Error("No user");
      return {
        user,
        userClient: createMockSupabaseClient(supabaseOptions),
      };
    },
  };
}

// ============================================================================
// BEHAVIORAL TESTS: These test the actual contract of the function
// ============================================================================

Deno.test("llm-cancel: Authentication", async (t) => {
  await t.step("returns 401 when authorization header is missing", async () => {
    const { ApiError } = await import("../_shared/errors.ts");

    const deps = createMockDeps({
      authError: new ApiError("Missing authorization header", 401),
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "job-123" }, token: null });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 401);
    assertStringIncludes(body.error as string, "authorization");
  });

  await t.step("returns 401 when token is invalid", async () => {
    const { ApiError } = await import("../_shared/errors.ts");

    const deps = createMockDeps({
      authError: new ApiError("Invalid or expired token", 401),
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "job-123" }, token: "invalid-token" });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 401);
    assertStringIncludes(body.error as string, "Invalid");
  });
});

Deno.test("llm-cancel: Request Validation", async (t) => {
  await t.step("returns 400 when job_id is missing", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: {} });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "job_id");
  });

  await t.step("returns 400 when job_id is empty string", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "job_id");
  });

  await t.step("returns 400 when job_id is not a string", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: 123 } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 400);
    assertStringIncludes(body.error as string, "job_id");
  });

  await t.step("returns 405 for non-POST requests", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);

    for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
      const request = new Request("http://localhost/llm-cancel", { method });
      const response = await handler(request);
      const { status, body } = await parseJsonResponse(response);

      assertEquals(status, 405, `${method} should be rejected`);
      assertStringIncludes(body.error as string, "Method not allowed");
    }
  });
});

Deno.test("llm-cancel: Authorization", async (t) => {
  await t.step("returns 403 when user has no customer_id", async () => {
    const deps = createMockDeps({
      user: createMockUser({ customer_id: null }),
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "job-123" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 403);
    assertStringIncludes(body.error as string, "customer");
  });

  await t.step("returns 404 when job belongs to different customer (RLS filters it)", async () => {
    // With RLS, jobs from other customers are simply not visible
    // The query returns null/empty, indistinguishable from "job doesn't exist"
    const deps = createMockDeps({
      supabaseOptions: {
        jobData: null, // RLS filters out inaccessible jobs
        jobError: { message: "No rows returned" },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "other-users-job" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    // RLS makes unauthorized access indistinguishable from "not found"
    assertEquals(status, 404);
    assertEquals(body.code, "JOB_NOT_FOUND");
  });
});

Deno.test("llm-cancel: Job State Validation", async (t) => {
  await t.step("returns 404 for non-existent job", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobData: null,
        jobError: { message: "No rows returned" },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "non-existent" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 404);
    assertEquals(body.code, "JOB_NOT_FOUND");
    assertStringIncludes(body.error as string, "not found");
  });

  await t.step("returns 409 when job is in terminal state", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobData: { status: "completed" },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "completed-job" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 409);
    assertEquals(body.code, "ALREADY_TERMINAL");
    assertStringIncludes(body.error as string, "terminal state");
  });

  await t.step("returns 500 for unexpected database errors", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobData: { status: "processing" },
        updateError: { message: "Database connection failed" },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "job-123" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 500);
    assertStringIncludes(body.error as string, "Failed to cancel job");
  });
});

Deno.test("llm-cancel: Successful Cancellation", async (t) => {
  await t.step("returns 200 with success when job is cancelled", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobData: { status: "processing" },
        updateData: { id: "job-123" },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "job-123" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.cancelled, true);
    assertEquals(body.job_id, "job-123");
    assertStringIncludes(body.message as string, "successfully");
  });

  await t.step("returns 200 with false cancelled when job already completed", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobData: { status: "processing" },
        updateData: null, // No rows updated (race condition - another request completed it)
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "job-123" } });

    const response = await handler(request);
    const { status, body } = await parseJsonResponse(response);

    assertEquals(status, 200);
    assertEquals(body.cancelled, false);
    assertEquals(body.job_id, "job-123");
    assertStringIncludes(body.message as string, "may have already completed");
  });
});

Deno.test("llm-cancel: CORS", async (t) => {
  await t.step("OPTIONS request returns CORS headers", async () => {
    // Set allowed origins for CORS validation
    const originalOrigins = Deno.env.get("ALLOWED_ORIGINS");
    Deno.env.set("ALLOWED_ORIGINS", "http://localhost:3000");

    try {
      const deps = createMockDeps();
      const handler = createHandler(deps);
      const request = new Request("http://localhost/llm-cancel", {
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

Deno.test("llm-cancel: Error Response Format", async (t) => {
  await t.step("all errors return JSON with error field", async () => {
    const deps = createMockDeps({
      supabaseOptions: {
        jobData: null,
        jobError: { message: "No rows returned" },
      },
    });
    const handler = createHandler(deps);
    const request = createRequest({ body: { job_id: "bad-job" } });

    const response = await handler(request);
    const { body } = await parseJsonResponse(response);

    assertExists(body.error);
    assertEquals(typeof body.error, "string");
  });

  await t.step("error responses include Content-Type header", async () => {
    const deps = createMockDeps();
    const handler = createHandler(deps);
    const request = createRequest({ body: {} }); // Missing job_id

    const response = await handler(request);

    assertEquals(response.headers.get("Content-Type"), "application/json");
  });
});
