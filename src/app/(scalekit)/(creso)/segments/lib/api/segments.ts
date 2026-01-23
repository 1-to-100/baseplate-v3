/**
 * Segments API
 * Functions for segment operations (create, update, delete)
 */

import { createClient } from '@/lib/supabase/client';
import type { List, ListForDisplay, SegmentFilterDto } from '../types/list';

interface CreateSegmentInput {
  name: string;
  filters: SegmentFilterDto;
}

/**
 * Create a new segment
 * Calls the segments-create edge function which immediately saves the segment
 * with status 'new', then returns. Background processing is handled by pg_cron.
 *
 * @param input - Segment name and filters
 * @returns Promise resolving to the created segment
 */
export async function createSegment(input: CreateSegmentInput): Promise<List> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Call segments-create edge function
  const { data, error } = await supabase.functions.invoke('segments-create', {
    body: {
      name: input.name,
      filters: input.filters,
    },
  });

  if (error) {
    // Extract error message from response
    let errorMessage = 'Failed to create segment';

    // Check if error has context (raw Response object)
    const errorObj = error as { context?: Response; error?: string; message?: string };
    if (errorObj.context) {
      try {
        const clonedResponse = errorObj.context.clone();
        const errorData = await clonedResponse.json();
        if (errorData && typeof errorData === 'object') {
          const data = errorData as { error?: string; message?: string };
          errorMessage = data.error || data.message || errorMessage;
        }
      } catch {
        errorMessage = errorObj.message || errorMessage;
      }
    } else {
      errorMessage = errorObj.message || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return data as List;
}

/**
 * Get segments list with pagination and search
 */
export async function getSegments(params?: {
  page?: number;
  perPage?: number;
  search?: string;
}): Promise<{
  data: ListForDisplay[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
    prev: number | null;
    next: number | null;
  };
}> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Get current customer ID
  const { data: customerId, error: customerIdError } = await supabase.rpc('current_customer_id');

  if (customerIdError || !customerId) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // Build base query
  let query = supabase
    .from('lists')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId)
    .eq('list_type', 'segment')
    .is('deleted_at', null);

  // Apply search filter (case-insensitive)
  if (params?.search && params.search.trim()) {
    query = query.ilike('name', `%${params.search.trim()}%`);
  }

  // Apply ordering (most recent first)
  query = query.order('updated_at', { ascending: false });

  // Apply pagination
  const page = params?.page || 1;
  const perPage = params?.perPage || 12;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  // Execute query
  const { data: segments, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch segments: ${error.message}`);
  }

  // Get company counts for each segment
  const segmentsWithCounts = await Promise.all(
    (segments || []).map(async (segment) => {
      const { count: companyCount } = await supabase
        .from('list_companies')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', segment.list_id);

      return {
        ...segment,
        company_count: companyCount || 0,
      };
    })
  );

  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);

  return {
    data: segmentsWithCounts as ListForDisplay[],
    meta: {
      total,
      page,
      perPage,
      lastPage,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
}

/**
 * Delete a segment (soft delete)
 */
export async function deleteSegment(segmentId: string): Promise<void> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Get current customer ID
  const { data: customerId, error: customerIdError } = await supabase.rpc('current_customer_id');

  if (customerIdError || !customerId) {
    throw new Error(`Failed to get customer ID: ${customerIdError?.message ?? 'not available'}`);
  }

  // Verify segment belongs to customer and soft delete
  const { error: deleteError } = await supabase
    .from('lists')
    .update({ deleted_at: new Date().toISOString() })
    .eq('list_id', segmentId)
    .eq('customer_id', customerId)
    .eq('list_type', 'segment');

  if (deleteError) {
    throw new Error(`Failed to delete segment: ${deleteError.message}`);
  }
}

/**
 * Get segment by ID
 * NOTE: Stub - to be implemented
 */
export async function getSegmentById(listId: string): Promise<List | null> {
  console.log('getSegmentById called with:', listId);
  return null;
}
