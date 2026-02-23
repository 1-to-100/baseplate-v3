/**
 * Behavioral Tests for segments-search Edge Function
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { createHandler, type HandlerDeps } from "../../../src/app/(scalekit)/strategy-forge/lib/edge/segments-search/index.ts";

function createRequest(options: { method?: string; body?: unknown; token?: string } = {}): Request {
  const { method = "POST", body, token = "valid-token" } = options;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new Request("http://localhost/segments-search", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJsonResponse(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: await res.json() };
}

const mockOrganizations = [
  {
    id: "org-1",
    diffbotId: "diff-1",
    name: "Acme Inc",
    fullName: "Acme Inc.",
    logo: undefined,
    image: undefined,
    type: "Organization",
    location: undefined,
    nbEmployees: 100,
    nbEmployeesMin: undefined,
    nbEmployeesMax: undefined,
    categories: undefined,
    homepageUri: undefined,
  },
];

function createMockDeps(options: {
  searchResult?: { data: typeof mockOrganizations; totalCount: number };
  searchError?: Error;
} = {}): HandlerDeps {
  const searchResult = options.searchResult ?? { data: mockOrganizations, totalCount: 1 };

  return {
    authenticateRequest: async () => ({}),
    searchOrganizations: async () => {
      if (options.searchError) throw options.searchError;
      return searchResult;
    },
  };
}

Deno.test("segments-search: returns 200 with data on success", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(
    createRequest({ body: { filters: { country: "US" } } })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  assertEquals(Array.isArray(body.data), true);
  assertEquals((body.data as unknown[]).length, 1);
  assertEquals(body.totalCount, 1);
  assertEquals(body.page, 1);
  assertStringIncludes((body.diffbotQueries as string[])?.[0] ?? "", "company");
});

Deno.test("segments-search: returns 400 when filters missing", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ body: {} }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 400);
  assertStringIncludes((body.error as string) ?? "", "filters");
});

Deno.test("segments-search: returns 405 for non-POST", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ method: "GET", body: undefined }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 405);
  assertStringIncludes((body.error as string) ?? "", "Method not allowed");
});

Deno.test("segments-search: returns 409 when no results on first page", async () => {
  const handler = createHandler(
    createMockDeps({ searchResult: { data: [], totalCount: 0 } })
  );
  const res = await handler(
    createRequest({ body: { filters: { country: "XX" } } })
  );
  const { status } = await parseJsonResponse(res);
  assertEquals(status, 409);
});

Deno.test("segments-search: returns 503 on DIFFBOT_SERVICE_UNAVAILABLE", async () => {
  const handler = createHandler(
    createMockDeps({ searchError: new Error("DIFFBOT_SERVICE_UNAVAILABLE") })
  );
  const res = await handler(
    createRequest({ body: { filters: { country: "US" } } })
  );
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 503);
  assertStringIncludes((body.error as string) ?? "", "temporary");
});
