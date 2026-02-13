/**
 * Company scoring queue worker.
 * Invoked by pg_cron every 5 min; claims up to BATCH_SIZE pending rows,
 * invokes company-scoring for each, marks completed or failed.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createServiceClient();

  // Reset stale "processing" rows so they can be retried
  const staleThreshold = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000).toISOString();
  await supabase
    .from('company_scoring_queue')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('status', 'processing')
    .lt('updated_at', staleThreshold);

  // Claim up to BATCH_SIZE pending rows (atomic via RPC)
  const { data: claimed, error: claimError } = await supabase.rpc('claim_company_scoring_jobs', {
    claim_limit: BATCH_SIZE,
  });

  if (claimError) {
    console.error('Failed to claim company scoring jobs:', claimError);
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
      const { error } = await supabase.functions.invoke('company-scoring', {
        body: {
          company_id: row.company_id,
          customer_id: row.customer_id,
        },
      });
      if (error) throw error;

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
      console.error('Company scoring failed for job', row.id, errorMessage);
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

  return new Response(
    JSON.stringify({
      processed: rows.length,
      completed,
      failed,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
});
