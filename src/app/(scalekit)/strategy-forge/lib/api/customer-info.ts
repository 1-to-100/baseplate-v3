import { createClient } from '@/lib/supabase/client';
import type { CustomerInfo, CreateCustomerInfoPayload, UpdateCustomerInfoPayload } from '../types';

export async function createCustomerInfo(
  payload: CreateCustomerInfoPayload
): Promise<CustomerInfo> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { data, error } = await supabase
    .from('customer_info')
    .insert([
      {
        ...payload,
        customer_id: customerId,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create customer info: ${error.message}`);
  }

  return data;
}

export async function getCustomerInfo(): Promise<CustomerInfo[]> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { data, error } = await supabase
    .from('customer_info')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch customer info: ${error.message}`);
  }

  return data || [];
}

export async function getCustomerInfoById(customer_info_id: string): Promise<CustomerInfo> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { data, error } = await supabase
    .from('customer_info')
    .select('*')
    .eq('customer_info_id', customer_info_id)
    .eq('customer_id', customerId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch customer info by ID: ${error.message}`);
  }

  return data;
}

export async function getCustomerInfoByCustomerId(
  customer_id: number
): Promise<CustomerInfo | null> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const currentCustomerId = customerIdResult;

  // Only allow access to the current user's customer_id
  if (customer_id !== currentCustomerId) {
    throw new Error("Access denied: Cannot access other customer's data");
  }

  const { data, error } = await supabase
    .from('customer_info')
    .select('*')
    .eq('customer_id', customer_id)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

  if (error) {
    throw new Error(`Failed to fetch customer info by customer ID: ${error.message}`);
  }

  return data;
}

export async function updateCustomerInfo(
  payload: UpdateCustomerInfoPayload
): Promise<CustomerInfo> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { customer_info_id, ...updateData } = payload;

  const { data, error } = await supabase
    .from('customer_info')
    .update(updateData)
    .eq('customer_info_id', customer_info_id)
    .eq('customer_id', customerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update customer info: ${error.message}`);
  }

  return data;
}

export async function deleteCustomerInfo(customer_info_id: string): Promise<void> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  const { error } = await supabase
    .from('customer_info')
    .delete()
    .eq('customer_info_id', customer_info_id)
    .eq('customer_id', customerId);

  if (error) {
    throw new Error(`Failed to delete customer info: ${error.message}`);
  }
}

export async function getCurrentCustomerId(): Promise<number> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('customer_id');

  if (error) {
    throw new Error(`Failed to get current customer ID: ${error.message}`);
  }

  return data;
}

export async function getOrCreateCustomerInfo(): Promise<CustomerInfo> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current customer ID using the SQL function
  const { data: customerIdResult, error: customerIdError } = await supabase.rpc('customer_id');
  if (customerIdError) {
    throw new Error(`Failed to get customer ID: ${customerIdError.message}`);
  }
  const customerId = customerIdResult;

  // Get customer name from customers table
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('name')
    .eq('customer_id', customerId)
    .single();

  if (customerError) {
    throw new Error(`Failed to fetch customer name: ${customerError.message}`);
  }

  const companyName = customerData?.name || 'Unknown Company';

  // Try to get existing customer info
  const { data: existingInfo, error: fetchError } = await supabase
    .from('customer_info')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch customer info: ${fetchError.message}`);
  }

  if (existingInfo) {
    return existingInfo;
  }

  // Don't create an empty record - let the edge function handle creation
  // Return a minimal placeholder object so the UI can detect it's empty
  // This prevents null constraint errors on required fields
  return {
    customer_info_id: '', // Empty ID signals this is a placeholder
    customer_id: customerId,
    company_name: companyName,
    problem_overview: '',
    solution_overview: '',
    one_sentence_summary: '',
    tagline: '',
    competitive_overview: '',
    content_authoring_prompt: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as CustomerInfo;
}
