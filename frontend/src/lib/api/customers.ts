import { config } from "@/config";
import { apiFetch } from "./api-fetch";
import { Customer, TaxonomyItem } from "@/contexts/auth/types";
import { createClient } from "@/lib/supabase/client";

interface GetCustomersParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  managerId?: string[];
  subscriptionId?: string[];
  statusId?: string[];
}

interface GetCustomersResponse {
  data: Customer[]; 
  meta: {
    total: number;
    page: number;
    lastPage: number;
    perPage: number;
    currentPage: number;
    prev: number | null;
    next: number | null;
  };
}

interface CreateCustomerPayload {
  name: string;
  email: string;
  subscriptionId?: string;
  customerSuccessIds?: string[];
  ownerId?: string;
}

interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  id: string;
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  return apiFetch<Customer>(`${config.site.apiUrl}/customers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCustomers(): Promise<TaxonomyItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id, name')
    .order('name');
  
  if (error) throw error;
  
  return (data || []).map((customer: any) => ({
    id: customer.customer_id,
    name: customer.name,
  }));
}

export async function getSubscriptions(): Promise<TaxonomyItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('subscription_id, name')
    .order('name');
  
  if (error) throw error;
  
  return (data || []).map((subscription: any) => ({
    id: subscription.subscription_id,
    name: subscription.name,
  }));
}

export async function getCustomersList(params: GetCustomersParams = {}): Promise<GetCustomersResponse> {
  const supabase = createClient();
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Build the query with joins
  let query = supabase
    .from('customers')
    .select(`
      customer_id,
      name,
      domain,
      email,
      subscription_id,
      status,
      created_at,
      updated_at,
      subscription:subscriptions(subscription_id, name)
    `, { count: 'exact' })
    .range(from, to);
  
  // Apply filters
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,domain.ilike.%${params.search}%`);
  }
  
  if (params.subscriptionId && params.subscriptionId.length > 0) {
    query = query.in('subscription_id', params.subscriptionId);
  }
  
  if (params.statusId && params.statusId.length > 0) {
    query = query.in('status', params.statusId);
  }
  
  // Apply sorting
  const orderBy = params.orderBy || 'created_at';
  const orderDirection = params.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);
  
  return {
    data: (data || []).map((customer: any) => ({
      id: customer.customer_id,
      name: customer.name,
      email: customer.email,
      domain: customer.domain,
      subscriptionId: customer.subscription_id,
      status: customer.status,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      subscription: customer.subscription ? {
        id: customer.subscription.subscription_id,
        name: customer.subscription.name,
      } : undefined,
    })) as Customer[],
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

export async function getCustomerById(id: string): Promise<Customer> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('customers')
    .select(`
      customer_id,
      name,
      domain,
      email,
      subscription_id,
      status,
      created_at,
      updated_at,
      subscription:subscriptions(subscription_id, name)
    `)
    .eq('customer_id', id)
    .single();
  
  if (error) throw error;
  
  return {
    id: data.customer_id,
    name: data.name,
    email: data.email,
    domain: data.domain,
    subscriptionId: data.subscription_id,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    managerId: undefined,
    customerSuccessId: undefined,
    ownerId: undefined,
    subscriptionName: data.subscription?.name,
    manager: undefined,
    owner: undefined,
    subscription: data.subscription ? {
      id: data.subscription.subscription_id,
      name: data.subscription.name,
    } : undefined,
  } as unknown as Customer;
}

export async function updateCustomer(payload: UpdateCustomerPayload): Promise<Customer> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('customers')
    .update({
      name: payload.name,
      email: payload.email,
      subscription_id: payload.subscriptionId,
    })
    .eq('customer_id', payload.id);
  
  if (error) throw error;
  
  // Fetch and return updated customer
  return getCustomerById(payload.id);
}

export async function deleteCustomer(id: string): Promise<Customer> {
  const supabase = createClient();
  
  // Fetch customer before deletion
  const customerToDelete = await getCustomerById(id);
  
  const { error } = await supabase
    .from('customers')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'inactive',
    })
    .eq('customer_id', id);
  
  if (error) throw error;
  
  return customerToDelete;
}

export interface CustomerSuccessUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export async function getCustomerSuccessUsers(customerId: string): Promise<CustomerSuccessUser[]> {
  return apiFetch<CustomerSuccessUser[]>(`${config.site.apiUrl}/customers/${customerId}/customer-success`, {
    method: 'GET',
  });
}

export async function addCustomerSuccessUser(customerId: string, userId: string): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/customers/${customerId}/customer-success/${userId}`, {
    method: 'POST',
  });
}

export async function removeCustomerSuccessUser(customerId: string, userId: string): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/customers/${customerId}/customer-success/${userId}`, {
    method: 'DELETE',
  });
}

export async function updateCustomerSuccessUsers(customerId: string, userIds: string[]): Promise<CustomerSuccessUser[]> {
  return apiFetch<CustomerSuccessUser[]>(`${config.site.apiUrl}/customers/${customerId}/customer-success`, {
    method: 'PATCH',
    body: JSON.stringify({ userIds }),
  });
}