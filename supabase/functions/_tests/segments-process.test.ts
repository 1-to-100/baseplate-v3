/**
 * Behavioral Tests for segments-process Edge Function
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { createHandler, type HandlerDeps } from "../../../src/app/(scalekit)/strategy-forge/lib/edge/segments-process/index.ts";
import type { DiffbotOrganization } from "../../../src/app/(scalekit)/strategy-forge/lib/edge/segments-process/types.ts";

function createRequest(options: { method?: string; body?: unknown } = {}): Request {
  const { method = "POST", body } = options;
  return new Request("http://localhost/segments-process", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJsonResponse(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: await res.json() };
}

const mockSegment = {
  list_id: "seg-1",
  customer_id: "c-1",
  user_id: "u-1",
  name: "Test Segment",
  status: "new",
  filters: { country: "US" },
};

function createMockSupabaseClient(options: {
  segment?: typeof mockSegment | null;
  fetchError?: { message: string } | null;
} = {}) {
  const segment = options.segment ?? mockSegment;
  const fetchError = options.fetchError ?? null;

  return {
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (_key: string, _val: unknown) => ({
          single: () =>
            table === "lists"
              ? Promise.resolve({ data: fetchError ? null : segment, error: fetchError })
              : Promise.resolve({ data: null, error: null }),
        }),
      }),
      update: (_data: unknown) => ({
        eq: (_key: string, _val: unknown) => Promise.resolve({ error: null }),
      }),
      insert: (_data: unknown) => Promise.resolve({ error: null }),
      upsert: (_data: unknown) => Promise.resolve({ error: null }),
    }),
    functions: {
      invoke: (_name: string, _opts: unknown) => Promise.resolve({ data: null, error: null }),
    },
  };
}

function createMockDeps(options: {
  segment?: typeof mockSegment | null;
  fetchError?: { message: string } | null;
  searchResult?: { data: DiffbotOrganization[]; totalCount: number };
} = {}): HandlerDeps {
  const defaultResult: { data: DiffbotOrganization[]; totalCount: number } = { data: [], totalCount: 0 };
  return {
    createServiceClient: () => createMockSupabaseClient(options) as unknown as ReturnType<HandlerDeps['createServiceClient']>,
    searchOrganizations: async () =>
      options.searchResult ?? defaultResult,
  } as HandlerDeps;
}

Deno.test("segments-process: returns 200 with companies_added 0 when no companies", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(
    createRequest({ body: { segment_id: "seg-1", customer_id: "c-1" } })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  assertEquals((body as Record<string, unknown>).message, "Segment processed successfully");
  assertEquals((body as Record<string, unknown>).companies_added, 0);
});

Deno.test("segments-process: returns 404 when segment not found", async () => {
  const handler = createHandler(
    createMockDeps({ segment: null, fetchError: { message: "Not found" } })
  );
  const res = await handler(
    createRequest({ body: { segment_id: "seg-missing", customer_id: "c-1" } })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 404);
  assertStringIncludes((body.error as string) ?? "", "not found");
});

Deno.test("segments-process: returns 200 already processed when status !== new", async () => {
  const handler = createHandler(
    createMockDeps({
      segment: { ...mockSegment, status: "completed" },
    })
  );
  const res = await handler(
    createRequest({ body: { segment_id: "seg-1", customer_id: "c-1" } })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  assertEquals((body as Record<string, unknown>).message, "Segment already processed");
  assertEquals((body as Record<string, unknown>).status, "completed");
});

Deno.test("segments-process: returns 400 when segment_id missing", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ body: { customer_id: "c-1" } }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 400);
  assertStringIncludes((body.error as string) ?? "", "segment_id");
});

Deno.test("segments-process: OPTIONS returns 200", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ method: "OPTIONS", body: undefined }));
  assertEquals(res.status, 200);
});
