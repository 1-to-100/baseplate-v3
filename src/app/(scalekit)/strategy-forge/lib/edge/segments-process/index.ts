import { corsHeaders } from '../_shared/cors.ts';
import { ApiError, createErrorResponse } from '../_shared/errors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
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
import type { SegmentFilterDto } from './types.ts';

const MAX_COMPANIES = 100;

interface ProcessSegmentRequest {
  segment_id: string;
  customer_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: ProcessSegmentRequest = await req.json();

    if (!body.segment_id) {
      throw new ApiError('segment_id is required', 400);
    }

    const supabase = createServiceClient();

    // Fetch segment from database
    const { data: segment, error: fetchError } = await supabase
      .from('lists')
      .select('*')
      .eq('list_id', body.segment_id)
      .single();

    if (fetchError || !segment) {
      throw new ApiError('Segment not found', 404);
    }

    // Validate segment status
    if (segment.status !== 'new') {
      console.log(`Segment ${body.segment_id} already processed (status: ${segment.status})`);
      return new Response(
        JSON.stringify({ message: 'Segment already processed', status: segment.status }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Update status to processing
    const { error: updateError } = await supabase
      .from('lists')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('list_id', body.segment_id);

    if (updateError) {
      console.error('Failed to update segment status to processing:', updateError);
    }

    // Send processing started notification
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
      // Extract and validate filters
      const filters = segment.filters as SegmentFilterDto;
      if (!filters) {
        throw new Error('Segment has no filters');
      }

      // Convert filters to DQL
      const dqlQueries = DqlAdapter.convert(filters);
      if (dqlQueries.length === 0) {
        throw new Error('No valid DQL queries generated from filters');
      }

      console.log(`Processing segment ${body.segment_id}: ${dqlQueries.join(' ')}`);

      // Search Diffbot for companies
      const diffbotClient = new DiffbotClient();
      const { data: companies, totalCount } = await diffbotClient.searchOrganizations(dqlQueries, {
        size: MAX_COMPANIES,
        from: 0,
      });

      console.log(
        `Diffbot search completed for segment ${body.segment_id}: ${companies.length} companies found (total: ${totalCount})`
      );

      // Charge credits for successful Diffbot lookup (1 credit per company)
      if (companies.length > 0) {
        const { data: chargeResult, error: chargeError } = await supabase.rpc('charge_credits', {
          p_customer_id: segment.customer_id,
          p_amount: companies.length,
          p_reason: `Segment "${segment.name}": ${companies.length} companies from Diffbot`,
          p_action_code: 'COMPANY_LOOKUP',
          p_reference_id: segment.list_id,
        });

        if (chargeError) {
          console.error('Failed to charge credits:', chargeError);
          // Don't fail the segment processing if credit charging fails
          // The segment is already created and Diffbot was called
        } else {
          const result = chargeResult?.[0];
          if (result?.success) {
            console.log(
              `Charged ${companies.length} credits for segment ${body.segment_id}. New balance: ${result.new_balance}`
            );
          } else {
            console.error('Credit charge failed:', result?.error_message);
          }
        }
      }

      if (companies.length === 0) {
        // No companies found - mark as completed with 0 companies
        await supabase
          .from('lists')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('list_id', body.segment_id);

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
            segment_id: body.segment_id,
            companies_added: 0,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Bulk upsert companies (unique by diffbot_id); only valid companies returned
      console.log(`Upserting ${companies.length} companies...`);
      const { companyIds, companies: validCompanies } = await bulkUpsertCompanies(
        supabase,
        companies
      );
      console.log(`Upserted companies, got ${companyIds.length} IDs`);

      // Upsert company_metadata with full Diffbot payload (for company scoring)
      const metadataResult = await bulkUpsertCompanyMetadata(supabase, companyIds, validCompanies);
      console.log(
        `Upserted company_metadata: ${metadataResult.updated} updated, ${metadataResult.inserted} inserted`
      );

      // Create list_companies for every company (new and existing)
      console.log(`Linking companies to segment ${body.segment_id}...`);
      const linkedCount = await bulkInsertListCompanies(supabase, body.segment_id, companyIds);
      console.log(`Linked ${linkedCount} companies to segment`);

      // Bulk insert into customer_companies table
      console.log(`Creating customer_companies records...`);
      const customerCompaniesCount = await bulkInsertCustomerCompanies(
        supabase,
        segment.customer_id,
        validCompanies,
        companyIds
      );
      console.log(`Created ${customerCompaniesCount} customer_companies records`);

      // Update status to completed
      await supabase
        .from('lists')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('list_id', body.segment_id);

      // Send completion notification
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

      // Enqueue company scoring jobs and trigger worker (no pg_cron required)
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
        if (queueError) {
          console.error('Failed to enqueue company scoring jobs:', queueError);
        } else {
          console.log(`Enqueued ${companyIds.length} company scoring jobs`);
          // Trigger worker so queue is processed without pg_cron
          supabase.functions
            .invoke('company-scoring-worker', { body: {} })
            .catch((err) => console.error('Failed to trigger company-scoring-worker', err));
        }
      }

      return new Response(
        JSON.stringify({
          message: 'Segment processed successfully',
          segment_id: body.segment_id,
          companies_added: validCompanies.length,
          total_available: totalCount,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (processingError) {
      // Update status to failed
      await supabase
        .from('lists')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('list_id', body.segment_id);

      const errorMessage =
        processingError instanceof Error ? processingError.message : 'Unknown error';

      console.error(`Failed to process segment ${body.segment_id}:`, errorMessage);

      // Send failure notification
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
    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }

    console.error('Unexpected error in segments-process:', error);
    return createErrorResponse(error);
  }
});
