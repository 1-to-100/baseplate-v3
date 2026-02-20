/**
 * Behavioral Tests for segments-update Edge Function
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { createHandler, type HandlerDeps } from "../../../src/app/(scalekit)/strategy-forge/lib/edge/segments-update/index.ts";

function createRequest(options: {
  method?: string;
  body?: unknown;
  token?: string | null;
} = {}): Request {
  const { method = "POST", body, token = "valid-token" } = options;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new Request("http://localhost/segments-update", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJsonResponse(
  res: Response
): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: await res.json() };
}

function createMockSupabaseClient(options: {
  existingSegment?: Record<string, unknown> | null;
  fetchError?: { message: string } | null;
  duplicateSegment?: { list_id: string } | null;
  updateSegment?: Record<string, unknown> | null;
  updateError?: { message: string } | null;
} = {}) {
  const {
    existingSegment = {
      list_id: "seg-1",
      customer_id: "c-1",
      list_type: "segment",
      name: "Old",
      status: "completed",
      filters: {},
    },
    fetchError = null,
    duplicateSegment = null,
    updateSegment = {
      list_id: "seg-1",
      customer_id: "c-1",
      list_type: "segment",
      name: "Updated",
      status: "completed",
      filters: {},
    },
    updateError = null,
  } = options;

  const listChain = () => ({
    select: (_f: string) => ({
      eq: (_a: string, _v: unknown) => ({
        eq: (_b: string, _v2: unknown) => ({
          eq: (_c: string, _v3: unknown) => ({
            is: (_d: string, _v4: unknown) => ({
              single: () =>
                Promise.resolve({
                  data: fetchError ? null : existingSegment,
                  error: fetchError,
                }),
            }),
          }),
          ilike: (_d: string, _v4: string) => ({
            neq: (_e: string, _v5: unknown) => ({
              is: (_f: string, _v6: unknown) => ({
                maybeSingle: () =>
                  Promise.resolve({ data: duplicateSegment, error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
    update: (_data: unknown) => ({
      eq: (_a: string, _v: unknown) => ({
        eq: (_b: string, _v2: unknown) => ({
          select: (_f: string) => ({
            single: () =>
              Promise.resolve({
                data: updateError ? null : updateSegment,
                error: updateError,
              }),
          }),
        }),
      }),
    }),
  });

  return {
    from: (table: string) => {
      if (table === "list_companies") {
        return {
          delete: () => ({
            eq: (_: string, __: unknown) => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: () => Promise.resolve({ data: null, error: null }),
        };
      }
      return listChain();
    },
    functions: {
      invoke: (_name: string, _opts: unknown) => Promise.resolve({ data: null, error: null }),
    },
  };
}

function createMockDeps(options: {
  customerId?: string | null;
  supabaseOptions?: Parameters<typeof createMockSupabaseClient>[0];
} = {}): HandlerDeps {
  const { customerId = "c-1", supabaseOptions } = options;
  return {
    authenticateRequest: async () => ({ user_id: "u-1", customer_id: customerId }),
    createServiceClient: () => createMockSupabaseClient(supabaseOptions) as unknown as ReturnType<HandlerDeps['createServiceClient']>,
  } as HandlerDeps;
}

Deno.test("segments-update: returns 200 and updated segment on success", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(
    createRequest({
      body: {
        segment_id: "seg-1",
        name: "Updated Name",
        filters: { country: "US" },
      },
    })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  assertEquals((body as Record<string, unknown>).list_id, "seg-1");
  assertEquals((body as Record<string, unknown>).name, "Updated");
});

Deno.test("segments-update: returns 404 when segment not found", async () => {
  const handler = createHandler(
    createMockDeps({
      supabaseOptions: { existingSegment: null, fetchError: { message: "Not found" } },
    })
  );
  const res = await handler(
    createRequest({
      body: {
        segment_id: "seg-missing",
        name: "Any",
        filters: {},
      },
    })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 404);
  assertStringIncludes((body.error as string) ?? "", "not found");
});

Deno.test("segments-update: returns 409 when name duplicates", async () => {
  const handler = createHandler(
    createMockDeps({
      supabaseOptions: { duplicateSegment: { list_id: "other-1" } },
    })
  );
  const res = await handler(
    createRequest({
      body: {
        segment_id: "seg-1",
        name: "Duplicate",
        filters: {},
      },
    })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 409);
  assertStringIncludes((body.error as string) ?? "", "already exists");
});

Deno.test("segments-update: returns 400 when segment_id missing", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(
    createRequest({ body: { name: "A", filters: {} } })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 400);
  assertStringIncludes((body.error as string) ?? "", "segment_id");
});

Deno.test("segments-update: returns 403 when no customer_id", async () => {
  const handler = createHandler(createMockDeps({ customerId: null }));
  const res = await handler(
    createRequest({
      body: { segment_id: "seg-1", name: "A", filters: {} },
    })
  );
  const { status } = await parseJsonResponse(res);
  assertEquals(status, 403);
});
