/**
 * Behavioral Tests for segments-create Edge Function
 *
 * Run with: deno test --allow-env --allow-net --allow-read supabase/functions/_tests/segments-create.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "jsr:@std/assert@1";
import { createHandler, type HandlerDeps } from "../../../src/app/(scalekit)/strategy-forge/lib/edge/segments-create/index.ts";

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
  return new Request("http://localhost/segments-create", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJsonResponse(
  response: Response
): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = await response.json();
  return { status: response.status, body };
}

function createMockSupabaseClient(options: {
  existingSegment?: { list_id: string } | null;
  checkError?: { message: string } | null;
  insertSegment?: Record<string, unknown> | null;
  insertError?: { message: string } | null;
} = {}) {
  const {
    existingSegment = null,
    checkError = null,
    insertSegment = {
      list_id: "seg-123",
      customer_id: "c-1",
      list_type: "segment",
      name: "Test Segment",
      description: null,
      filters: {},
      user_id: "u-1",
      status: "new",
      subtype: "company",
      is_static: false,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      deleted_at: null,
    },
    insertError = null,
  } = options;

  const chain = (table: string) => {
    const listInsertPromise = Promise.resolve({
      data: insertError ? null : insertSegment,
      error: insertError,
    });
    const listSelectPromise = Promise.resolve({
      data: existingSegment,
      error: checkError,
    });

    return {
      select: (_fields: string) => ({
        eq: (_f: string, _v: unknown) => ({
          eq: (_f2: string, _v2: unknown) => ({
            ilike: (_f3: string, _v3: string) => ({
              is: (_f4: string, _v4: unknown) => ({
                maybeSingle: () => (table === "lists" ? listSelectPromise : Promise.resolve({ data: null, error: null })),
              }),
            }),
          }),
        }),
      }),
      insert: (_data: unknown) => {
        if (table === "notifications") {
          return Promise.resolve({ data: null, error: null });
        }
        return {
          select: (_fields: string) => ({
            single: () => (table === "lists" ? listInsertPromise : Promise.resolve({ data: null, error: null })),
          }),
        };
      },
    };
  };

  return {
    from: (table: string) => chain(table),
  };
}

function createMockDeps(options: {
  customerId?: string | null;
  authError?: Error;
  supabaseOptions?: Parameters<typeof createMockSupabaseClient>[0];
} = {}): HandlerDeps {
  const {
    customerId = "c-1",
    authError,
    supabaseOptions,
  } = options;

  return {
    authenticateRequest: async (_req: Request) => {
      if (authError) throw authError;
      return {
        user_id: "u-1",
        customer_id: customerId,
      };
    },
    createServiceClient: () => createMockSupabaseClient(supabaseOptions) as unknown as ReturnType<HandlerDeps['createServiceClient']>,
    fetch: async () => new Response(),
  } as HandlerDeps;
}

// ============================================================================
// Tests
// ============================================================================

Deno.test("segments-create: returns 201 and segment on success", async () => {
  const deps = createMockDeps();
  const handler = createHandler(deps);
  const req = createRequest({
    body: { name: "My Segment", filters: { country: "US" } },
  });

  const res = await handler(req);
  const { status, body } = await parseJsonResponse(res);

  assertEquals(status, 201);
  assertExists(body.list_id);
  assertEquals((body as Record<string, unknown>).name, "Test Segment");
  assertEquals((body as Record<string, unknown>).customer_id, "c-1");
});

Deno.test("segments-create: returns 400 when name is missing", async () => {
  const deps = createMockDeps();
  const handler = createHandler(deps);
  const req = createRequest({ body: { filters: {} } });

  const res = await handler(req);
  const { status, body } = await parseJsonResponse(res);

  assertEquals(status, 400);
  assertStringIncludes((body.error as string) ?? "", "name");
});

Deno.test("segments-create: returns 400 when filters is missing", async () => {
  const deps = createMockDeps();
  const handler = createHandler(deps);
  const req = createRequest({ body: { name: "Seg" } });

  const res = await handler(req);
  const { status, body } = await parseJsonResponse(res);

  assertEquals(status, 400);
  assertStringIncludes((body.error as string) ?? "", "filters");
});

Deno.test("segments-create: returns 400 when name too short", async () => {
  const deps = createMockDeps();
  const handler = createHandler(deps);
  const req = createRequest({ body: { name: "ab", filters: {} } });

  const res = await handler(req);
  const { status, body } = await parseJsonResponse(res);

  assertEquals(status, 400);
  assertStringIncludes((body.error as string) ?? "", "3 and 100");
});

Deno.test("segments-create: returns 403 when user has no customer_id", async () => {
  const deps = createMockDeps({ customerId: null });
  const handler = createHandler(deps);
  const req = createRequest({
    body: { name: "My Segment", filters: {} },
  });

  const res = await handler(req);
  const { status, body } = await parseJsonResponse(res);

  assertEquals(status, 403);
  assertStringIncludes((body.error as string) ?? "", "customer");
});

Deno.test("segments-create: returns 409 when segment name already exists", async () => {
  const deps = createMockDeps({
    supabaseOptions: { existingSegment: { list_id: "existing-1" } },
  });
  const handler = createHandler(deps);
  const req = createRequest({
    body: { name: "Duplicate", filters: {} },
  });

  const res = await handler(req);
  const { status, body } = await parseJsonResponse(res);

  assertEquals(status, 409);
  assertStringIncludes((body.error as string) ?? "", "already exists");
});

Deno.test("segments-create: OPTIONS returns 200 with no body", async () => {
  const deps = createMockDeps();
  const handler = createHandler(deps);
  const req = createRequest({ method: "OPTIONS", body: undefined });

  const res = await handler(req);
  assertEquals(res.status, 200);
  const text = await res.text();
  assertEquals(text, "");
});
