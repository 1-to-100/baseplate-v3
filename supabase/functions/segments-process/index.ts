import type { SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { ApiError, createErrorResponse } from '../_shared/errors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { DqlAdapter } from './dql-adapter.ts';
import { DiffbotClient } from './diffbot-client.ts';
import {
  bulkUpsertCompanies,
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

/**
 * Get credit balance for a customer using the get_credit_balance RPC
 * Returns the current balance (available credits)
 */
async function getCreditBalance(
  supabase: SupabaseClient,
  customerId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('get_credit_balance', {
    p_customer_id: customerId,
  });

  if (error) {
    console.error('Error fetching credit balance:', error);
    throw new Error(`Failed to fetch credit balance: ${error.message}`);
  }

  // RPC returns an array with one row, or empty if no wallet
  const row = data?.[0];
  if (!row) {
    console.log(`No credit balance found for customer ${customerId}, treating as 0 credits`);
    return 0;
  }

  return row.balance ?? 0;
}

/**
 * Charge credits for companies saved
 * Returns true if charge was successful, false if insufficient credits
 */
async function chargeCreditsForCompanies(
  supabase: SupabaseClient,
  customerId: string,
  amount: number,
  segmentName: string,
  segmentId: string
): Promise<{ success: boolean; newBalance?: number; errorMessage?: string }> {
  if (amount <= 0) {
    return { success: true, newBalance: 0 };
  }

  const { data, error } = await supabase.rpc('charge_credits', {
    p_customer_id: customerId,
    p_amount: amount,
    p_reason: `Segment "${segmentName}": ${amount} companies saved`,
    p_action_code: 'segment_company_upsert',
    p_reference_id: segmentId,
  });

  if (error) {
    console.error('Error charging credits:', error);
    return { success: false, errorMessage: error.message };
  }

  const row = data?.[0];
  if (row && row.success === false) {
    return { success: false, errorMessage: row.error_message ?? 'Insufficient credits' };
  }

  return { success: true, newBalance: row?.new_balance };
}

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
      const { data: companies, totalCount } = await diffbotClient.searchOrganizations(
        dqlQueries,
        {
          size: MAX_COMPANIES,
          from: 0,
        }
      );

      console.log(
        `Diffbot search completed for segment ${body.segment_id}: ${companies.length} companies found (total: ${totalCount})`
      );

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

      // =====================================================
      // CREDIT CHECK: Get available credits and cap companies
      // =====================================================
      const creditBalance = await getCreditBalance(supabase, segment.customer_id);
      console.log(`Credit balance for customer ${segment.customer_id}: ${creditBalance}`);

      // If no credits available, complete without saving companies
      if (creditBalance <= 0) {
        console.log(`No credits available for customer ${segment.customer_id}, skipping company upsert`);

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
            0,
            'Insufficient credits to save companies'
          );
        }

        return new Response(
          JSON.stringify({
            message: 'Segment processed but no companies saved (insufficient credits)',
            segment_id: body.segment_id,
            companies_added: 0,
            companies_found: companies.length,
            total_available: totalCount,
            credits_available: 0,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Cap companies to available credits (1 company = 1 credit)
      const companiesToSave = companies.slice(0, creditBalance);
      const wasCapped = companiesToSave.length < companies.length;

      if (wasCapped) {
        console.log(
          `Capping companies from ${companies.length} to ${companiesToSave.length} due to credit limit`
        );
      }

      // Bulk upsert companies to companies table
      console.log(`Upserting ${companiesToSave.length} companies...`);
      const companyIds = await bulkUpsertCompanies(supabase, companiesToSave);
      console.log(`Upserted companies, got ${companyIds.length} IDs`);

      // Bulk insert into list_companies junction table
      console.log(`Linking companies to segment ${body.segment_id}...`);
      const linkedCount = await bulkInsertListCompanies(supabase, body.segment_id, companyIds);
      console.log(`Linked ${linkedCount} companies to segment`);

      // Bulk insert into customer_companies table
      console.log(`Creating customer_companies records...`);
      const customerCompaniesCount = await bulkInsertCustomerCompanies(
        supabase,
        segment.customer_id,
        companiesToSave,
        companyIds
      );
      console.log(`Created ${customerCompaniesCount} customer_companies records`);

      // =====================================================
      // CHARGE CREDITS: 1 credit per company saved
      // =====================================================
      const creditsToCharge = companiesToSave.length;
      console.log(`Charging ${creditsToCharge} credits for ${companiesToSave.length} companies...`);

      const chargeResult = await chargeCreditsForCompanies(
        supabase,
        segment.customer_id,
        creditsToCharge,
        segment.name,
        segment.list_id
      );

      if (!chargeResult.success) {
        // This shouldn't happen since we checked balance, but log it
        console.error(
          `Failed to charge credits after upsert: ${chargeResult.errorMessage}. Companies were saved but not charged.`
        );
      } else {
        console.log(`Credits charged successfully. New balance: ${chargeResult.newBalance}`);
      }

      // Update status to completed
      await supabase
        .from('lists')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('list_id', body.segment_id);

      // Send completion notification
      const notificationNote = wasCapped
        ? `Credit limit reached. ${companies.length - companiesToSave.length} additional companies were not saved.`
        : undefined;

      if (segment.user_id) {
        await notifyProcessingCompleted(
          supabase,
          segment.customer_id,
          segment.user_id,
          segment.name,
          segment.list_id,
          companiesToSave.length,
          notificationNote
        );
      }

      return new Response(
        JSON.stringify({
          message: wasCapped
            ? 'Segment processed with credit limit'
            : 'Segment processed successfully',
          segment_id: body.segment_id,
          companies_added: companiesToSave.length,
          companies_found: companies.length,
          total_available: totalCount,
          credits_charged: creditsToCharge,
          credit_limit_reached: wasCapped,
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
    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
    return createErrorResponse(apiError);
  }
});
