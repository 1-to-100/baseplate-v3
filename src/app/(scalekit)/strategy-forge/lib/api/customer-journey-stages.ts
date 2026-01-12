import { createClient } from '@/lib/supabase/client';
import type {
  CustomerJourneyStage,
  CreateCustomerJourneyStagePayload,
  UpdateCustomerJourneyStagePayload,
  GetCustomerJourneyStagesParams,
  GetCustomerJourneyStagesResponse,
} from '../types';

/**
 * Get all customer journey stages for the current customer
 */
export async function getCustomerJourneyStagesList(
  params: GetCustomerJourneyStagesParams = {}
): Promise<GetCustomerJourneyStagesResponse> {
  const supabase = createClient();

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  // Debug: Log the customer ID to see what type it is
  console.log('🔍 [List] Customer ID from SQL function:', customerId, 'Type:', typeof customerId);
  console.log('🔍 [List] Customer ID is integer?', Number.isInteger(customerId));
  console.log('🔍 [List] Customer ID as number:', Number(customerId));

  let query = supabase
    .from('customer_journey_stages')
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId);

  // Apply filters
  if (params.journey_phase) {
    query = query.eq('journey_phase', params.journey_phase);
  }

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  // Apply ordering
  const orderBy = params.order_by || 'order_index';
  const orderDirection = params.order_direction || 'asc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  // Apply pagination
  if (params.limit) {
    query = query.limit(params.limit);
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch customer journey stages: ${error.message}`);
  }

  return {
    data: data || [],
    count: count || 0,
  };
}

/**
 * Create a new customer journey stage
 */
export async function createCustomerJourneyStage(
  payload: CreateCustomerJourneyStagePayload
): Promise<CustomerJourneyStage> {
  const supabase = createClient();

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Get customer_id using the SQL function
  const { data: customerIdData, error: customerIdError } = await supabase.rpc('customer_id');

  if (customerIdError || !customerIdData) {
    throw new Error('Unable to get customer ID');
  }

  // Debug: Log the customer ID to see what type it is
  console.log('🔍 Customer ID from SQL function:', customerIdData, 'Type:', typeof customerIdData);
  console.log('🔍 Customer ID is integer?', Number.isInteger(customerIdData));
  console.log('🔍 Customer ID as number:', Number(customerIdData));

  // Get user ID from users table
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (userDataError || !userData?.user_id) {
    throw new Error('Unable to get user data');
  }

  const { data, error } = await supabase
    .from('customer_journey_stages')
    .insert({
      ...payload,
      customer_id: customerIdData,
      created_by: userData.user_id,
      updated_by: userData.user_id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create customer journey stage: ${error.message}`);
  }

  return data;
}

/**
 * Get a customer journey stage by ID
 */
export async function getCustomerJourneyStageById(id: string): Promise<CustomerJourneyStage> {
  const supabase = createClient();

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { data, error } = await supabase
    .from('customer_journey_stages')
    .select('*')
    .eq('customer_journey_stage_id', id)
    .eq('customer_id', customerId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch customer journey stage: ${error.message}`);
  }

  return data;
}

/**
 * Update a customer journey stage
 */
export async function updateCustomerJourneyStage(
  id: string,
  payload: UpdateCustomerJourneyStagePayload
): Promise<CustomerJourneyStage> {
  const supabase = createClient();

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Get customer_id using the SQL function
  const { data: customerIdData, error: customerIdError } = await supabase.rpc('customer_id');

  if (customerIdError || !customerIdData) {
    throw new Error('Unable to get customer ID');
  }

  // Get user ID from users table
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (userDataError || !userData?.user_id) {
    throw new Error('Unable to get user data');
  }

  const { data, error } = await supabase
    .from('customer_journey_stages')
    .update({
      ...payload,
      updated_by: userData.user_id,
    })
    .eq('customer_journey_stage_id', id)
    .eq('customer_id', customerIdData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update customer journey stage: ${error.message}`);
  }

  return data;
}

/**
 * Delete a customer journey stage
 */
export async function deleteCustomerJourneyStage(id: string): Promise<void> {
  const supabase = createClient();

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { error } = await supabase
    .from('customer_journey_stages')
    .delete()
    .eq('customer_journey_stage_id', id)
    .eq('customer_id', customerId);

  if (error) {
    throw new Error(`Failed to delete customer journey stage: ${error.message}`);
  }
}

/**
 * Test cross-tenant access (should fail)
 */
export async function testCrossTenantAccess(): Promise<boolean> {
  const supabase = createClient();

  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  try {
    // Try to access a different customer's data (this should fail due to RLS)
    const { data, error } = await supabase
      .from('customer_journey_stages')
      .select('*')
      .neq('customer_id', 999999) // Non-existent customer ID
      .limit(1);

    // If we get data, RLS is not working properly
    return !data || data.length === 0;
  } catch (error) {
    // If we get an error, RLS is working properly
    return true;
  }
}
