/**
 * Behavioral Tests for company-scoring Edge Function
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { createHandler, type HandlerDeps } from "../../../src/app/(scalekit)/strategy-forge/lib/edge/company-scoring/index.ts";

const UUID1 = 'a1b2c3d4-e5f6-4780-a123-456789abcdef';
const UUID2 = 'b2c3d4e5-f6a7-4891-b234-567890abcdef';

function createRequest(options: { method?: string; body?: unknown } = {}): Request {
  const { method = "POST", body } = options;
  return new Request("http://localhost/company-scoring", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJsonResponse(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  return { status: res.status, body: await res.json() };
}

function createMockSupabaseClient(options: {
  company?: { company_id: string } | null;
  customer?: { customer_id: string } | null;
  customerCompany?: { scoring_results_updated_at: string | null } | null;
  metadata?: { diffbot_json: Record<string, unknown> } | null;
  updateError?: { message: string } | null;
} = {}) {
  const {
    company = { company_id: UUID1 },
    customer = { customer_id: UUID2 },
    customerCompany = { scoring_results_updated_at: null },
    metadata = { diffbot_json: { name: "Acme Inc" } },
    updateError = null,
  } = options;

  let table = '';
  return {
    from: (t: string) => {
      table = t;
      return {
        select: (_cols: string) => ({
          eq: (_a: string, _v: unknown) => ({
            single: () => {
              if (table === 'companies') return Promise.resolve({ data: company, error: company ? null : { message: 'Not found' } });
              if (table === 'customers') return Promise.resolve({ data: customer, error: customer ? null : { message: 'Not found' } });
              if (table === 'customer_companies') return Promise.resolve({ data: customerCompany, error: customerCompany ? null : { message: 'Not found' } });
              return Promise.resolve({ data: null, error: null });
            },
            eq: (_b: string, _v2: unknown) => ({
              single: () => Promise.resolve({ data: customerCompany, error: customerCompany ? null : { message: 'Not found' } }),
            }),
            order: (_col: string, _opts: unknown) => ({
              limit: (_n: number) => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: metadata,
                    error: metadata ? null : { message: 'Diffbot data not found' },
                  }),
              }),
            }),
          }),
        }),
        update: (_data: unknown) => ({
          eq: (_a: string, _v: unknown) => ({
            eq: (_b: string, _v2: unknown) => Promise.resolve({ error: updateError }),
          }),
        }),
      };
    },
  };
}

function createMockDeps(options: {
  supabaseOptions?: Parameters<typeof createMockSupabaseClient>[0];
  openaiContent?: string;
} = {}): HandlerDeps {
  const {
    supabaseOptions,
    openaiContent = JSON.stringify({
      score: 7,
      short_description: 'Solid company.',
      full_description: 'Detailed analysis here.',
    }),
  } = options;

  return {
    createServiceClient: () => createMockSupabaseClient(supabaseOptions) as unknown as ReturnType<HandlerDeps['createServiceClient']>,
    callOpenaiScoring: async () => ({ content: openaiContent }),
  } as HandlerDeps;
}

Deno.test("company-scoring: returns 200 with score on success", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ body: { company_id: UUID1, customer_id: UUID2 } }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  assertEquals((body as Record<string, unknown>).status, 'completed');
  assertEquals((body as Record<string, unknown>).score, 7);
  assertStringIncludes((body as Record<string, unknown>).short_description as string, 'Solid');
});

Deno.test("company-scoring: returns 400 when UUIDs invalid", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ body: { company_id: 'x', customer_id: UUID2 } }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 400);
  assertStringIncludes((body.error as string) ?? "", "UUID");
});

Deno.test("company-scoring: returns 404 when company not found", async () => {
  const handler = createHandler(
    createMockDeps({ supabaseOptions: { company: null } })
  );
  const res = await handler(createRequest({ body: { company_id: UUID1, customer_id: UUID2 } }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 404);
  assertStringIncludes((body.error as string) ?? "", "Company");
});

Deno.test("company-scoring: returns 404 when customer company not found", async () => {
  const handler = createHandler(
    createMockDeps({ supabaseOptions: { customerCompany: null } })
  );
  const res = await handler(createRequest({ body: { company_id: UUID1, customer_id: UUID2 } }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 404);
  assertStringIncludes((body.error as string) ?? "", "Customer company");
});

Deno.test("company-scoring: returns 200 skipped when recently scored", async () => {
  const handler = createHandler(
    createMockDeps({
      supabaseOptions: {
        customerCompany: { scoring_results_updated_at: new Date().toISOString() },
      },
    })
  );
  const res = await handler(createRequest({ body: { company_id: UUID1, customer_id: UUID2 } }));
  const { status, body } = await parseJsonResponse(res);
  assertEquals(status, 200);
  assertEquals((body as Record<string, unknown>).status, 'skipped');
  assertEquals((body as Record<string, unknown>).reason, 'recently_scored');
});

Deno.test("company-scoring: OPTIONS returns 200", async () => {
  const handler = createHandler(createMockDeps());
  const res = await handler(createRequest({ method: "OPTIONS", body: undefined }));
  assertEquals(res.status, 200);
});
