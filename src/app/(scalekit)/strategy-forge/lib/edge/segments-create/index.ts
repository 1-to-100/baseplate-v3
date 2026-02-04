import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import { authenticateRequest } from '../../../../../../../supabase/functions/_shared/auth.ts';
import {
  ApiError,
  createErrorResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import type { CreateSegmentRequest, CreateSegmentResponse } from './types.ts';

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
    let body: CreateSegmentRequest;
    try {
      body = await req.json();
      console.log('Request body received:', { name: body.name, hasFilters: !!body.filters });
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new ApiError('Invalid request body', 400);
    }

    // Validate input
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

    // Check name uniqueness (case-insensitive) for this customer
    const { data: existingSegment, error: checkError } = await supabase
      .from('lists')
      .select('list_id')
      .eq('customer_id', user.customer_id)
      .eq('list_type', 'segment')
      .ilike('name', trimmedName)
      .is('deleted_at', null)
      .maybeSingle();

    if (checkError) {
      throw new ApiError(`Database error: ${checkError.message}`, 500);
    }

    if (existingSegment) {
      throw new ApiError(
        'A segment with this title already exists. Please choose a different title.',
        409
      );
    }

    // Insert segment into lists table
    const { data: segment, error: insertError } = await supabase
      .from('lists')
      .insert({
        customer_id: user.customer_id,
        user_id: user.user_id,
        list_type: 'segment',
        name: trimmedName,
        description: null,
        filters: body.filters,
        status: 'new',
        subtype: 'company',
        is_static: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert segment:', insertError);
      throw new ApiError(`Failed to create segment: ${insertError.message}`, 500);
    }

    console.log('Segment created successfully:', segment.list_id);

    // Create notification for segment creation
    const { error: notificationError } = await supabase.from('notifications').insert({
      customer_id: user.customer_id,
      user_id: user.user_id,
      type: ['in_app'],
      title: 'Segment Created',
      message: `Segment "${trimmedName}" has been created and processing has started.`,
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

    // Trigger background processing immediately (fire-and-forget)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && serviceRoleKey) {
      // Fire-and-forget: don't await, let it run in background
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
        // Log error but don't fail the request
        console.error('Failed to trigger segment processing:', error);
      });
    } else {
      console.warn(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, cannot trigger background processing'
      );
    }

    return new Response(JSON.stringify(segment as CreateSegmentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    console.error('Error in segments-create:', error);

    if (error instanceof ApiError) {
      return createErrorResponse(error);
    }

    // For unexpected errors, create an ApiError instance
    const apiError = new ApiError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
    return createErrorResponse(apiError);
  }
});
