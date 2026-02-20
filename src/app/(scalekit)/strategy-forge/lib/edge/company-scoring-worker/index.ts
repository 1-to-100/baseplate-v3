/// <reference lib="deno.ns" />
/**
 * Company scoring queue worker.
 * Invoked by pg_cron or segments-process; claims pending rows, invokes company-scoring, marks completed/failed.
 */
import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';

const BATCH_SIZE = 20;
const STALE_PROCESSING_MINUTES = 15;

interface QueueRow {
  id: string;
  customer_id: string;
  company_id: string;
  status: string;
}

export interface HandlerDeps {
  createServiceClient: () => ReturnType<typeof createServiceClient>;
  invokeCompanyScoring: (body: {
    company_id: string;
    customer_id: string;
  }) => Promise<void | { error: unknown }>;
}

const defaultDeps: HandlerDeps = {
  createServiceClient,
  invokeCompanyScoring: async (body) => {
    const supabase = createServiceClient();
    return supabase.functions.invoke('company-scoring', { body });
  },
};

export function createHandler(deps: HandlerDeps = defaultDeps) {
  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const supabase = deps.createServiceClient();

    const staleThreshold = new Date(
      Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000
    ).toISOString();
    await supabase
      .from('company_scoring_queue')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('status', 'processing')
      .lt('updated_at', staleThreshold);

    const { data: claimed, error: claimError } = await supabase.rpc('claim_company_scoring_jobs', {
      claim_limit: BATCH_SIZE,
    });

    if (claimError) {
      return new Response(JSON.stringify({ error: claimError.message, processed: 0 }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = (claimed || []) as QueueRow[];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ processed: 0, completed: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let completed = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const result = await deps.invokeCompanyScoring({
          company_id: row.company_id,
          customer_id: row.customer_id,
        });
        if (result?.error) throw result.error;

        await supabase
          .from('company_scoring_queue')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', row.id);
        completed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await supabase
          .from('company_scoring_queue')
          .update({
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ processed: rows.length, completed, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  };
}

Deno.serve(createHandler());
