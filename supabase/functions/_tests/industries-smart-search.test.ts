/**
 * Behavioral Tests for industries-smart-search Edge Function
 */
import { assertEquals, assertStringIncludes, assert } from 'jsr:@std/assert@1';
import { createHandler, type HandlerDeps } from "../../../src/app/(scalekit)/strategy-forge/lib/edge/industries-smart-search/index.ts";

function createRequest(options: { method?: string; body?: unknown; token?: string } = {}): Request {
  const { method = "POST", body, token = "valid-token" } = options;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new Request("http://localhost/industries-smart-search", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJsonResponse(res: Response): Promise<{ status: number; body: unknown }> {
  return { status: res.status, body: await res.json() };
}

const mockIndustries = [
  { industry_id: 1, value: "Technology" },
  { industry_id: 2, value: "Healthcare" },
];

// Fixed embeddings so similarity is deterministic; keys must match industry.value
const mockEmbeddingsMap = new Map<string, number[]>([
  ["Technology", [1, 0, 0]],
  ["Healthcare", [0.6, 0.8, 0]],
]);

const mockQueryEmbedding = [0.8, 0.6, 0]; // closer to healthcare

function createMockDeps(options: {
  industries?: Array<{ industry_id: number; value: string }>;
  embeddingsMap?: Map<string, number[]>;
  queryEmbedding?: number[];
} = {}): HandlerDeps {
  const industries = options.industries ?? mockIndustries;
  const embeddingsMap = options.embeddingsMap ?? mockEmbeddingsMap;
  const queryEmbedding = options.queryEmbedding ?? mockQueryEmbedding;

  return {
    authenticateRequest: async () => ({ user_id: "u-1" }),
    createServiceClient: () =>
      ({
        from: () => ({
          select: () => ({
            order: () => Promise.resolve({ data: industries, error: null }),
          }),
        }),
      }) as unknown as ReturnType<HandlerDeps['createServiceClient']>,
    getIndustryEmbeddings: async () => ({
      industries,
      embeddings: embeddingsMap,
    }),
    getEmbeddings: async (texts: string[]) => {
      if (texts.length === 1) return [queryEmbedding];
      return industries.map((_, i) => [i * 0.1, 1 - i * 0.1, 0]);
    },
  } as HandlerDeps;
}

Deno.test("industries-smart-search: returns 200 with results", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ body: { query: "tech" } }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  const arr = body as Array<Record<string, unknown>>;
  assertEquals(Array.isArray(arr), true);
  assert(arr.length >= 1);
  assert(arr[0].industry_id !== undefined);
  assert(arr[0].value !== undefined);
  assert(arr[0].score !== undefined);
});

Deno.test("industries-smart-search: returns 400 when query missing", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ body: {} }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 400);
  assertStringIncludes((body as Record<string, unknown>).error as string, "query");
});

Deno.test("industries-smart-search: returns 400 when query empty", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ body: { query: "   " } }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 400);
  assertStringIncludes((body as Record<string, unknown>).error as string, "empty");
});

Deno.test("industries-smart-search: OPTIONS returns 200", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ method: "OPTIONS", body: undefined }));
  assertEquals(res.status, 200);
});
