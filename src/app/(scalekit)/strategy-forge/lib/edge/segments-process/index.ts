/// <reference lib="deno.ns" />
import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import {
  ApiError,
  createErrorResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import { DqlAdapter } from './dql-adapter.ts';
import { DiffbotClient } from './diffbot-client.ts';
import {
  bulkUpsertCompanies,
  bulkUpsertCompanyMetadata,
  bulkInsertListCompanies,
  bulkInsertCustomerCompanies,
} from './company-upsert.ts';
import {
  notifyProcessingStarted,
  notifyProcessingCompleted,
  notifyProcessingFailed,
} from './notifications.ts';
import { safeParseProcessSegmentRequest } from './schema.ts';
import type { SegmentFilterDto } from './types.ts';
import type { DiffbotOrganization } from './types.ts';

const MAX_COMPANIES = 100;

export interface HandlerDeps {
  createServiceClient: () => ReturnType<typeof createServiceClient>;
  searchOrganizations: (
    query: string[],
    options: { size: number; from: number }
  ) => Promise<{ data: DiffbotOrganization[]; totalCount: number }>;
}

const defaultDeps: HandlerDeps = {
  createServiceClient,
  searchOrganizations: async (query, options) => {
    const client = new DiffbotClient();
    return client.searchOrganizations(query, options);
  },
};

export function createHandler(deps: HandlerDeps = defaultDeps) {
  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ApiError('Invalid request body', 400);
      }

      const parseResult = safeParseProcessSegmentRequest(body);
      if (!parseResult.success) {
        const first = parseResult.error.issues[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'segment_id is required';
        throw new ApiError(msg, 400);
      }

      const { segment_id, customer_id: _customerId } = parseResult.data;
      const supabase = deps.createServiceClient();

      const { data: segment, error: fetchError } = await supabase
        .from('lists')
        .select('*')
        .eq('list_id', segment_id)
        .single();

      if (fetchError || !segment) {
        throw new ApiError('Segment not found', 404);
      }

      if (segment.status !== 'new') {
        return new Response(
          JSON.stringify({ message: 'Segment already processed', status: segment.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      await supabase
        .from('lists')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('list_id', segment_id);

      if (segment.user_id) {
        await notifyProcessingStarted(
          supabase,
          segment.customer_id,
          segment.user_id,
          segment.name,
          segment.list_id
        );
      }

      try {
        const filters = segment.filters as SegmentFilterDto;
        if (!filters) throw new Error('Segment has no filters');

        const dqlQueries = DqlAdapter.convert(filters);
        if (dqlQueries.length === 0) throw new Error('No valid DQL queries generated from filters');

        const { data: companies, totalCount } = await deps.searchOrganizations(dqlQueries, {
          size: MAX_COMPANIES,
          from: 0,
        });

        if (companies.length === 0) {
          await supabase
            .from('lists')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('list_id', segment_id);

          if (segment.user_id) {
            await notifyProcessingCompleted(
              supabase,
              segment.customer_id,
              segment.user_id,
              segment.name,
              segment.list_id,
              0
            );
          }

          return new Response(
            JSON.stringify({
              message: 'Segment processed successfully',
              segment_id,
              companies_added: 0,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        const { companyIds, companies: validCompanies } = await bulkUpsertCompanies(
          supabase,
          companies
        );
        await bulkUpsertCompanyMetadata(supabase, companyIds, validCompanies);
        await bulkInsertListCompanies(supabase, segment_id, companyIds);
        await bulkInsertCustomerCompanies(
          supabase,
          segment.customer_id,
          validCompanies,
          companyIds
        );

        await supabase
          .from('lists')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('list_id', segment_id);

        if (segment.user_id) {
          await notifyProcessingCompleted(
            supabase,
            segment.customer_id,
            segment.user_id,
            segment.name,
            segment.list_id,
            validCompanies.length
          );
        }

        if (companyIds.length > 0) {
          const now = new Date().toISOString();
          const queueRecords = companyIds.map((company_id) => ({
            customer_id: segment.customer_id,
            company_id,
            status: 'pending',
            updated_at: now,
          }));
          const { error: queueError } = await supabase
            .from('company_scoring_queue')
            .upsert(queueRecords, {
              onConflict: 'customer_id,company_id',
              ignoreDuplicates: false,
            });
          if (!queueError) {
            supabase.functions
              .invoke('company-scoring-worker', { body: {} })
              .catch((err) => console.error('Failed to trigger company-scoring-worker', err));
          }
        }

        return new Response(
          JSON.stringify({
            message: 'Segment processed successfully',
            segment_id,
            companies_added: validCompanies.length,
            total_available: totalCount,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } catch (processingError) {
        await supabase
          .from('lists')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('list_id', segment_id);

        const errorMessage =
          processingError instanceof Error ? processingError.message : 'Unknown error';
        if (segment.user_id) {
          await notifyProcessingFailed(
            supabase,
            segment.customer_id,
            segment.user_id,
            segment.name,
            segment.list_id,
            errorMessage
          );
        }
        throw processingError;
      }
    } catch (error) {
      if (error instanceof ApiError) return createErrorResponse(error);
      return createErrorResponse(error);
    }
  };
}

Deno.serve(createHandler());
