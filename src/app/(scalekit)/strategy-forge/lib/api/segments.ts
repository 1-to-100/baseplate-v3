import { createClient } from '@/lib/supabase/client';
import type {
  Segment,
  CreateSegmentPayload,
  UpdateSegmentPayload,
  GetSegmentsParams,
  GetSegmentsResponse,
} from '../types';

interface SegmentApiOptions {
  customerId?: string;
}

async function resolveCustomerId(
  supabase: ReturnType<typeof createClient>,
  override?: string
): Promise<string> {
  if (override) {
    return override;
  }
  const { data, error } = await supabase.rpc('current_customer_id');
  if (error || !data) {
    throw new Error(`Failed to get customer ID: ${error?.message ?? 'not available'}`);
  }
  return data;
}

export async function getSegmentsList(
  params: GetSegmentsParams = {},
  options?: SegmentApiOptions
): Promise<GetSegmentsResponse> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const customerId = await resolveCustomerId(supabase, options?.customerId);

  // Build the query
  let query = supabase
    .from('segments')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId);

  // Apply search filter
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  // Apply ordering
  const orderBy = params.orderBy || 'created_at';
  const orderDirection = params.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  // Apply pagination
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch segments: ${error.message}`);
  }

  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);

  return {
    data: data || [],
    meta: {
      total,
      page,
      lastPage,
      perPage,
      currentPage: page,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
}

export async function createSegment(payload: CreateSegmentPayload): Promise<Segment> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } =
    await supabase.rpc('current_customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  // Get the user's integer ID from the users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('user_id')
    .eq('auth_user_id', user.id)
    .single();

  if (userError || !userData) {
    throw new Error(`Failed to get user ID: ${userError?.message || 'User not found'}`);
  }

  const { data, error } = await supabase
    .from('segments')
    .insert({
      name: payload.name,
      description: payload.description,
      code: payload.code || null,
      external_id: payload.external_id || null,
      customer_id: customerId,
      created_by: userData.user_id,
      updated_by: userData.user_id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create segment: ${error.message}`);
  }

  return data;
}

export async function getSegmentById(id: string): Promise<Segment> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } =
    await supabase.rpc('current_customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .eq('segment_id', id)
    .eq('customer_id', customerId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch segment: ${error.message}`);
  }

  return data;
}

export async function updateSegment(
  segmentId: string,
  payload: UpdateSegmentPayload,
  options?: SegmentApiOptions
): Promise<Segment> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const customerId = await resolveCustomerId(supabase, options?.customerId);

  // Get the user's integer ID from the users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('user_id')
    .eq('auth_user_id', user.id)
    .single();

  if (userError || !userData) {
    throw new Error(`Failed to get user ID: ${userError?.message || 'User not found'}`);
  }

  const updateData: Partial<{
    name: string;
    description: string;
    code: string;
    external_id: string;
    updated_by: string;
  }> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.code !== undefined) updateData.code = payload.code;
  if (payload.external_id !== undefined) updateData.external_id = payload.external_id;
  updateData.updated_by = userData.user_id;

  const { data, error } = await supabase
    .from('segments')
    .update(updateData)
    .eq('segment_id', segmentId)
    .eq('customer_id', customerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update segment: ${error.message}`);
  }

  return data;
}

export async function deleteSegment(id: string): Promise<void> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } =
    await supabase.rpc('current_customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { data, error } = await supabase
    .from('segments')
    .delete()
    .eq('segment_id', id)
    .eq('customer_id', customerId)
    .select();

  if (error) {
    throw new Error(`Failed to delete segment: ${error.message}`);
  }

  // Check if any rows were actually deleted
  if (!data || data.length === 0) {
    throw new Error(`Segment with ID ${id} not found or you don't have permission to delete it`);
  }
}
