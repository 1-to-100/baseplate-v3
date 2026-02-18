/**
 * Behavioral Tests for company-scoring-worker Edge Function
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { createHandler, type HandlerDeps } from "../../../src/app/(scalekit)/strategy-forge/lib/edge/company-scoring-worker/index.ts";

function createRequest(options: { method?: string } = {}): Request {
  const { method = "POST" } = options;
  return new Request("http://localhost/company-scoring-worker", {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

async function parseJsonResponse(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: await res.json() };
}

const mockClaimedRows = [
  { id: "job-1", customer_id: "c-1", company_id: "co-1", status: "pending" },
  { id: "job-2", customer_id: "c-1", company_id: "co-2", status: "pending" },
];

function createMockSupabaseClientFull(options: {
  claimError?: { message: string } | null;
  claimedRows?: typeof mockClaimedRows;
} = {}) {
  const claimError = options.claimError ?? null;
  const claimedRows = options.claimedRows ?? [];

  const thenable = { then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) };

  return {
    from: (_table: string) => ({
      update: (_data: unknown) => ({
        eq: (_key: string, _val: unknown) => ({
          lt: (_k: string, _v: unknown) => thenable,
          ...thenable,
        }),
      }),
    }),
    rpc: (name: string, _params: Record<string, unknown>) => {
      if (name === 'claim_company_scoring_jobs') {
        return Promise.resolve({ data: claimError ? null : claimedRows, error: claimError });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

function createMockDeps(options: {
  claimError?: { message: string } | null;
  claimedRows?: typeof mockClaimedRows;
  invokeSucceeds?: boolean;
} = {}): HandlerDeps {
  const invokeSucceeds = options.invokeSucceeds !== false;

  return {
    createServiceClient: () => createMockSupabaseClientFull(options) as unknown as ReturnType<HandlerDeps['createServiceClient']>,
    invokeCompanyScoring: async () => {
      if (!invokeSucceeds) throw new Error('Scoring failed');
      return undefined;
    },
  } as HandlerDeps;
}

Deno.test("company-scoring-worker: returns 200 with processed 0 when no jobs", async () => {
  const handler = createHandler(createMockDeps({ claimedRows: [] }));
  const res = await handler(createRequest());
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  assertEquals(body.processed, 0);
  assertEquals(body.completed, 0);
  assertEquals(body.failed, 0);
});

Deno.test("company-scoring-worker: returns 500 when claim RPC fails", async () => {
  const handler = createHandler(
    createMockDeps({ claimError: { message: "RPC error" } })
  );
  const res = await handler(createRequest());
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 500);
  assertStringIncludes((body.error as string) ?? "", "RPC");
  assertEquals(body.processed, 0);
});

Deno.test("company-scoring-worker: returns 200 with completed/failed counts", async () => {
  const handler = createHandler(
    createMockDeps({
      claimedRows: mockClaimedRows,
      invokeSucceeds: true,
    })
  );
  const res = await handler(createRequest());
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  assertEquals(body.processed, 2);
  assertEquals(body.completed, 2);
  assertEquals(body.failed, 0);
});

Deno.test("company-scoring-worker: OPTIONS returns 200", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ method: "OPTIONS" }));
  assertEquals(res.status, 200);
});
