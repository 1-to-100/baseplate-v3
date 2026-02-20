/// <reference lib="deno.ns" />
import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import { authenticateRequest } from '../../../../../../../supabase/functions/_shared/auth.ts';
import {
  ApiError,
  createErrorResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import {
  safeParseCreateSegmentRequest,
  type CreateSegmentRequest,
  type CreateSegmentResponse,
} from './schema.ts';

// =============================================================================
// Handler Dependencies (for testing)
// =============================================================================

export interface HandlerDeps {
  authenticateRequest: (req: Request) => Promise<{ user_id: string; customer_id: string | null }>;
  createServiceClient: () => ReturnType<typeof createServiceClient>;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const defaultDeps: HandlerDeps = {
  authenticateRequest: async (req) => {
    const user = await authenticateRequest(req);
    return { user_id: user.user_id, customer_id: user.customer_id };
  },
  createServiceClient,
  fetch: globalThis.fetch,
};

// =============================================================================
// Handler
// =============================================================================

export function createHandler(deps: HandlerDeps = defaultDeps) {
  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { user_id, customer_id } = await deps.authenticateRequest(req);
      console.log('User authenticated:', { user_id, customer_id });

      if (!customer_id) {
        throw new ApiError('User must belong to a customer', 403);
      }

      let body: unknown;
      try {
        body = await req.json();
      } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        throw new ApiError('Invalid request body', 400);
      }

      const parseResult = safeParseCreateSegmentRequest(body);
      if (!parseResult.success) {
        const first = parseResult.error.issues[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
        throw new ApiError(msg, 400);
      }

      const { name, filters } = parseResult.data;
      const trimmedName = name.trim();
      if (trimmedName.length < 3 || trimmedName.length > 100) {
        throw new ApiError('Segment name must be between 3 and 100 characters', 400);
      }

      const supabase = deps.createServiceClient();

      const { data: existingSegment, error: checkError } = await supabase
        .from('lists')
        .select('list_id')
        .eq('customer_id', customer_id)
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

      const { data: segment, error: insertError } = await supabase
        .from('lists')
        .insert({
          customer_id,
          user_id,
          list_type: 'segment',
          name: trimmedName,
          description: null,
          filters,
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

      await supabase.from('notifications').insert({
        customer_id,
        user_id,
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
      // Notification failure is non-fatal; don't throw

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && serviceRoleKey) {
        deps
          .fetch(`${supabaseUrl}/functions/v1/segments-process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              segment_id: segment.list_id,
              customer_id,
            }),
          })
          .catch((error) => {
            console.error('Failed to trigger segment processing:', error);
          });
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
      const apiError = new ApiError(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
      return createErrorResponse(apiError);
    }
  };
}

Deno.serve(createHandler());
