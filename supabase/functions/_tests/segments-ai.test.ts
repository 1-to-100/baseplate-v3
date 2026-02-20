/**
 * Behavioral Tests for segments-ai Edge Function
 */
import { assertEquals, assertExists, assertStringIncludes } from 'jsr:@std/assert@1';
import { createHandler, type HandlerDeps } from "../../../src/app/(scalekit)/strategy-forge/lib/edge/segments-ai/index.ts";

function createRequest(options: { method?: string; body?: unknown; token?: string | null } = {}): Request {
  const { method = "POST", body, token = "valid-token" } = options;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new Request("http://localhost/segments-ai", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJsonResponse(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: await res.json() };
}

function createMockSupabaseClient(options: {
  industries?: Array<{ industry_id: number; value: string }>;
  companySizes?: Array<{ company_size_id: number; value: string }>;
} = {}) {
  const industries = options.industries ?? [
    { industry_id: 1, value: "Technology" },
    { industry_id: 2, value: "Healthcare" },
  ];
  const companySizes = options.companySizes ?? [
    { company_size_id: 1, value: "1-10 employees" },
    { company_size_id: 2, value: "11-50 employees" },
  ];

  return {
    from: (table: string) => ({
      select: (_cols: string) => ({
        order: (_col: string) =>
          Promise.resolve({
            data: table === "option_industries" ? industries : companySizes,
            error: null,
          }),
      }),
    }),
  };
}

function createMockDeps(options: {
  customerId?: string | null;
  openaiContent?: string;
  openaiError?: Error;
  supabaseOptions?: Parameters<typeof createMockSupabaseClient>[0];
} = {}): HandlerDeps {
  const {
    customerId = "c-1",
    openaiContent = JSON.stringify({
      name: "Tech Companies in US",
      filters: { country: "US", categories: ["Technology"] },
    }),
    openaiError,
    supabaseOptions,
  } = options;

  return {
    authenticateRequest: async () => ({ user_id: "u-1", customer_id: customerId }),
    createServiceClient: () => createMockSupabaseClient(supabaseOptions) as unknown as ReturnType<HandlerDeps['createServiceClient']>,
    callOpenaiChat: async () => {
      if (openaiError) throw openaiError;
      return { content: openaiContent };
    },
  } as HandlerDeps;
}

Deno.test("segments-ai: returns 200 with mapped response on success", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(
    createRequest({ body: { description: "Technology companies in the United States" } })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  assertExists(body.name);
  assertEquals((body as Record<string, unknown>).name, "Tech Companies in US");
  const filters = (body as Record<string, unknown>).filters as Record<string, unknown>;
  assertExists(filters);
  assertEquals(filters.country, "US");
  assertEquals(Array.isArray(filters.categories) && filters.categories.includes("Technology"), true);
});

Deno.test("segments-ai: returns 400 when description too short", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ body: { description: "ab" } }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 400);
  assertStringIncludes((body.error as string) ?? "", "3");
});

Deno.test("segments-ai: returns 400 when description missing", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ body: {} }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 400);
  assertStringIncludes((body.error as string) ?? "", "description");
});

Deno.test("segments-ai: returns 403 when no customer_id", async () => {
  const handler = createHandler(createMockDeps({ customerId: null }));
  const res = await handler(
    createRequest({ body: { description: "Some segment" } })
  );
  const { status } = await parseJsonResponse(res);
  assertEquals(status, 403);
});

Deno.test("segments-ai: returns 500 when OpenAI returns invalid JSON", async () => {
  const handler = createHandler(
    createMockDeps({ openaiContent: "not valid json {" })
  );
  const res = await handler(
    createRequest({ body: { description: "Valid description here" } })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 500);
  assertStringIncludes((body.error as string) ?? "", "invalid");
});

Deno.test("segments-ai: returns 500 when OpenAI returns empty content", async () => {
  const handler = createHandler(createMockDeps({ openaiContent: "" }));
  const res = await handler(
    createRequest({ body: { description: "Valid description" } })
  );
  const { status } = await parseJsonResponse(res);
  assertEquals(status, 500);
});
