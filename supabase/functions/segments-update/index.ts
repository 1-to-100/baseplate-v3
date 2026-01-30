import { corsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { ApiError, createErrorResponse } from '../_shared/errors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import type { UpdateSegmentRequest, UpdateSegmentResponse } from './types.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const user = await authenticateRequest(req);
    console.log('User authenticated:', { user_id: user.user_id, customer_id: user.customer_id });

    if (!user.customer_id) {
      throw new ApiError('User must belong to a customer', 403);
    }

    // Parse request body
    let body: UpdateSegmentRequest;
    try {
      body = await req.json();
      console.log('Request body received:', {
        segment_id: body.segment_id,
        name: body.name,
        hasFilters: !!body.filters,
      });
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new ApiError('Invalid request body', 400);
    }

    // Validate input
    if (!body.segment_id || typeof body.segment_id !== 'string') {
      throw new ApiError('Segment ID is required', 400);
    }

    if (!body.name || typeof body.name !== 'string') {
      throw new ApiError('Segment name is required', 400);
    }

    const trimmedName = body.name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 100) {
      throw new ApiError('Segment name must be between 3 and 100 characters', 400);
    }

    if (!body.filters || typeof body.filters !== 'object') {
      throw new ApiError('Filters are required', 400);
    }

    const supabase = createServiceClient();

    // Get existing segment to check ownership and compare filters
    const { data: existingSegment, error: fetchError } = await supabase
      .from('lists')
      .select('*')
      .eq('list_id', body.segment_id)
      .eq('customer_id', user.customer_id)
      .eq('list_type', 'segment')
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingSegment) {
      throw new ApiError('Segment not found', 404);
    }

    // Check name uniqueness (excluding current segment)
    const { data: duplicateSegment, error: checkError } = await supabase
      .from('lists')
      .select('list_id')
      .eq('customer_id', user.customer_id)
      .eq('list_type', 'segment')
      .ilike('name', trimmedName)
      .neq('list_id', body.segment_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (checkError) {
      throw new ApiError(`Database error: ${checkError.message}`, 500);
    }

    if (duplicateSegment) {
      throw new ApiError(
        'A segment with this title already exists. Please choose a different title.',
        409
      );
    }

    // Check if filters have changed
    const existingFilters = existingSegment.filters || {};
    const newFilters = body.filters || {};
    const filtersChanged = JSON.stringify(existingFilters) !== JSON.stringify(newFilters);

    console.log('Filters changed:', filtersChanged);

    // If filters changed, we need to re-process the segment
    if (filtersChanged) {
      // Delete existing list_companies for this segment
      const { error: deleteError } = await supabase
        .from('list_companies')
        .delete()
        .eq('list_id', body.segment_id);

      if (deleteError) {
        console.error('Failed to delete existing companies:', deleteError);
        // Continue anyway - we'll re-process
      } else {
        console.log('Deleted existing list_companies for segment:', body.segment_id);
      }
    }

    // Update segment - set status to 'new' if filters changed so it gets reprocessed
    const { data: segment, error: updateError } = await supabase
      .from('lists')
      .update({
        name: trimmedName,
        filters: body.filters,
        status: filtersChanged ? 'new' : existingSegment.status,
        updated_at: new Date().toISOString(),
      })
      .eq('list_id', body.segment_id)
      .eq('customer_id', user.customer_id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update segment:', updateError);
      throw new ApiError(`Failed to update segment: ${updateError.message}`, 500);
    }

    console.log('Segment updated successfully:', segment.list_id);

    // If filters changed, trigger background processing
    if (filtersChanged) {
      // Create notification for segment update
      const { error: notificationError } = await supabase.from('notifications').insert({
        customer_id: user.customer_id,
        user_id: user.user_id,
        type: ['in_app'],
        title: 'Segment Updated',
        message: `Segment "${trimmedName}" has been updated and is being reprocessed.`,
        channel: 'segment',
        metadata: {
          id: segment.list_id,
          name: trimmedName,
          status: 'new',
        },
        generated_by: 'system (segment service)',
      });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the request if notification creation fails
      }

      // Trigger background processing (fire-and-forget)
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && serviceRoleKey) {
        fetch(`${supabaseUrl}/functions/v1/segments-process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            segment_id: segment.list_id,
            customer_id: user.customer_id,
          }),
        }).catch((error) => {
          console.error('Failed to trigger segment processing:', error);
        });

        console.log('Triggered segments-process for segment:', segment.list_id);
      } else {
        console.warn(
          'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, cannot trigger background processing'
        );
      }
    }

    return new Response(JSON.stringify(segment as UpdateSegmentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in segments-update:', error);

    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }

    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
    return createErrorResponse(apiError);
  }
});
