/// <reference lib="deno.ns" />
import { corsHeaders } from '../../../../../../../supabase/functions/_shared/cors.ts';
import { authenticateRequest } from '../../../../../../../supabase/functions/_shared/auth.ts';
import {
  ApiError,
  createErrorResponse,
} from '../../../../../../../supabase/functions/_shared/errors.ts';
import { createServiceClient } from '../../../../../../../supabase/functions/_shared/supabase.ts';
import { safeParseUpdateSegmentRequest, type UpdateSegmentResponse } from './schema.ts';

export interface HandlerDeps {
  authenticateRequest: (req: Request) => Promise<{ user_id: string; customer_id: string | null }>;
  createServiceClient: () => ReturnType<typeof createServiceClient>;
}

const defaultDeps: HandlerDeps = {
  authenticateRequest: async (req) => {
    const user = await authenticateRequest(req);
    return { user_id: user.user_id, customer_id: user.customer_id };
  },
  createServiceClient,
};

export function createHandler(deps: HandlerDeps = defaultDeps) {
  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { user_id, customer_id } = await deps.authenticateRequest(req);
      if (!customer_id) {
        throw new ApiError('User must belong to a customer', 403);
      }

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ApiError('Invalid request body', 400);
      }

      const parseResult = safeParseUpdateSegmentRequest(body);
      if (!parseResult.success) {
        const first = parseResult.error.issues[0];
        const msg = first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
        throw new ApiError(msg, 400);
      }

      const { segment_id, name, filters } = parseResult.data;
      const trimmedName = name.trim();
      if (trimmedName.length < 3 || trimmedName.length > 100) {
        throw new ApiError('Segment name must be between 3 and 100 characters', 400);
      }

      const supabase = deps.createServiceClient();

      const { data: existingSegment, error: fetchError } = await supabase
        .from('lists')
        .select('*')
        .eq('list_id', segment_id)
        .eq('customer_id', customer_id)
        .eq('list_type', 'segment')
        .is('deleted_at', null)
        .single();

      if (fetchError || !existingSegment) {
        throw new ApiError('Segment not found', 404);
      }

      const { data: duplicateSegment, error: checkError } = await supabase
        .from('lists')
        .select('list_id')
        .eq('customer_id', customer_id)
        .eq('list_type', 'segment')
        .ilike('name', trimmedName)
        .neq('list_id', segment_id)
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

      const existingFilters = (existingSegment.filters as Record<string, unknown>) || {};
      const newFilters = filters || {};
      const filtersChanged = JSON.stringify(existingFilters) !== JSON.stringify(newFilters);

      if (filtersChanged) {
        await supabase.from('list_companies').delete().eq('list_id', segment_id);
      }

      const { data: segment, error: updateError } = await supabase
        .from('lists')
        .update({
          name: trimmedName,
          filters,
          status: filtersChanged ? 'new' : existingSegment.status,
          updated_at: new Date().toISOString(),
        })
        .eq('list_id', segment_id)
        .eq('customer_id', customer_id)
        .select()
        .single();

      if (updateError) {
        throw new ApiError(`Failed to update segment: ${updateError.message}`, 500);
      }

      if (filtersChanged) {
        await supabase.from('notifications').insert({
          customer_id,
          user_id,
          type: ['in_app'],
          title: 'Segment Updated',
          message: `Segment "${trimmedName}" has been updated and is being reprocessed.`,
          channel: 'segment',
          metadata: { id: segment.list_id, name: trimmedName, status: 'new' },
          generated_by: 'system (segment service)',
        });

        supabase.functions
          .invoke('segments-process', {
            body: { segment_id: segment.list_id, customer_id },
          })
          .catch((err) => console.error('Failed to trigger segment processing:', err));
      }

      return new Response(JSON.stringify(segment as UpdateSegmentResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return createErrorResponse(error);
      }
      return createErrorResponse(
        new ApiError(error instanceof Error ? error.message : 'Internal server error', 500)
      );
    }
  };
}

Deno.serve(createHandler());
