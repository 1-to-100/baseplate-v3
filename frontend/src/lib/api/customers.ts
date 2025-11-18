import { Customer, TaxonomyItem } from "@/contexts/auth/types";
import { createClient } from "@/lib/supabase/client";

interface CustomerData {
  customer_id: string;
  name: string;
}

interface SubscriptionTypeData {
  subscription_type_id: string;
  name: string;
}

interface ManagerData {
  manager_id: string;
  full_name: string | null;
  email: string;
}

interface CustomerSuccessData {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface OwnerData {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface SubscriptionTypeData {
  subscription_type_id: string;
  name: string;
}

interface CustomerSuccessOwnedCustomerRow {
  customer_id: string;
  users: CustomerSuccessData | CustomerSuccessData[] | null;
}

interface CustomerSuccessOwnedCustomerRowWithoutId {
  users: CustomerSuccessData | CustomerSuccessData[] | null;
}

interface CustomerWithRelations {
  customer_id: string;
  name: string;
  email_domain: string | null;
  subscription_type_id: string | null;
  owner_id: string | null;
  manager_id: string | null;
  lifecycle_stage: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  manager?: ManagerData | ManagerData[] | null;
  owner: OwnerData | OwnerData[] | null;
  subscription: SubscriptionTypeData | SubscriptionTypeData[] | null;
}

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
  // API call removed
  throw new Error('API calls removed');
}

export async function getCustomers(): Promise<TaxonomyItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('customers')
    .select('customer_id, name')
    .order('name');
  
  if (error) throw error;
  
  return (data || []).map((customer: CustomerData) => ({
    id: customer.customer_id,
    name: customer.name,
  }));
}

export async function getSubscriptions(): Promise<TaxonomyItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('subscription_types')
    .select('subscription_type_id, name')
    .order('name');
  
  if (error) throw error;
  
  return (data || []).map((subscription: SubscriptionTypeData) => ({
    id: subscription.subscription_type_id,
    name: subscription.name,
  }));
}

export async function getCustomersList(params: GetCustomersParams = {}): Promise<GetCustomersResponse> {
  const supabase = createClient();
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Build the query with joins - removed manager join since it references managers table, not users
  let query = supabase
    .from('customers')
    .select(`
      customer_id,
      name,
      email_domain,
      subscription_type_id,
      owner_id,
      manager_id,
      lifecycle_stage,
      active,
      created_at,
      updated_at,
      owner:users!customers_owner_id_fkey(user_id, full_name, email),
      subscription:subscription_types(subscription_type_id, name)
    `, { count: 'exact' })
    .range(from, to);
  
  // Apply filters
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email_domain.ilike.%${params.search}%`);
  }
  
  if (params.subscriptionId && params.subscriptionId.length > 0) {
    query = query.in('subscription_type_id', params.subscriptionId);
  }
  
  if (params.statusId && params.statusId.length > 0) {
    query = query.in('lifecycle_stage', params.statusId);
  }
  
  // Apply sorting
  const orderBy = params.orderBy || 'created_at';
  const orderDirection = params.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);
  
  // Fetch customer success users for all customers
  const customerIds = (data || []).map((c: CustomerWithRelations) => c.customer_id);
  const customerSuccessMap = new Map<string, CustomerSuccessData[]>();
  
  if (customerIds.length > 0) {
    const { data: csData, error: csError } = await supabase
      .from('customer_success_owned_customers')
      .select(`
        customer_id,
        users!customer_success_owned_customers_user_id_fkey(user_id, full_name, email)
      `)
      .in('customer_id', customerIds);
    
    if (!csError && csData) {
      csData.forEach((cs: CustomerSuccessOwnedCustomerRow) => {
        const user = Array.isArray(cs.users) ? cs.users[0] : cs.users;
        if (user) {
          const existing = customerSuccessMap.get(cs.customer_id) || [];
          customerSuccessMap.set(cs.customer_id, [
            ...existing,
            {
              user_id: user.user_id,
              full_name: user.full_name,
              email: user.email,
            },
          ]);
        }
      });
    }
  }
  
  return {
    data: (data || []).map((customer: CustomerWithRelations) => {
      const customerSuccess = customerSuccessMap.get(customer.customer_id) || [];
      
      return {
        id: customer.customer_id,
        name: customer.name,
        email: customer.email_domain || '',
        subscriptionId: customer.subscription_type_id || '',
        managerId: customer.manager_id || '',
        customerSuccessId: '', // Handled separately via customer_success_owned_customers
        ownerId: customer.owner_id || '',
        status: customer.lifecycle_stage,
        subscriptionName: Array.isArray(customer.subscription) ? customer.subscription[0]?.name || '' : customer.subscription?.name || '',
        manager: { id: '', name: '', email: '' }, // Manager is deprecated, use customerSuccess instead
        owner: customer.owner ? (Array.isArray(customer.owner) ? {
          id: customer.owner[0]?.user_id || '',
          firstName: customer.owner[0]?.full_name?.split(' ')[0] || '',
          lastName: customer.owner[0]?.full_name?.split(' ').slice(1).join(' ') || '',
          email: customer.owner[0]?.email || '',
        } : {
          id: customer.owner.user_id,
          firstName: customer.owner.full_name?.split(' ')[0] || '',
          lastName: customer.owner.full_name?.split(' ').slice(1).join(' ') || '',
          email: customer.owner.email || '',
        }) : { id: '', firstName: '', lastName: '' },
        numberOfUsers: undefined,
        customerSuccess: customerSuccess.map((cs) => ({
          id: cs.user_id,
          name: cs.full_name || '',
          email: cs.email || '',
        })),
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
      };
    }) as Customer[],
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
      email_domain,
      subscription_type_id,
      owner_id,
      manager_id,
      lifecycle_stage,
      active,
      created_at,
      updated_at,
      owner:users!customers_owner_id_fkey(user_id, full_name, email),
      subscription:subscription_types(subscription_type_id, name)
    `)
    .eq('customer_id', id)
    .single();
  
  if (error) throw error;
  
  // Fetch customer success users
  const { data: csData, error: csError } = await supabase
    .from('customer_success_owned_customers')
    .select(`
      users!customer_success_owned_customers_user_id_fkey(user_id, full_name, email)
    `)
    .eq('customer_id', id);
  
  const subscription = data.subscription as SubscriptionTypeData | SubscriptionTypeData[] | null;
  const owner = data.owner as OwnerData | OwnerData[] | null;
  const customerSuccess = (!csError && csData) ? csData
    .map((cs: CustomerSuccessOwnedCustomerRowWithoutId) => {
      const user = Array.isArray(cs.users) ? cs.users[0] : cs.users;
      return user;
    })
    .filter((u: CustomerSuccessData | null | undefined): u is CustomerSuccessData => u !== null && u !== undefined)
    .map((u: CustomerSuccessData) => ({
      id: u.user_id,
      name: u.full_name || '',
      email: u.email || '',
    })) : [];
  
  return {
    id: data.customer_id,
    name: data.name,
    email: data.email_domain || '',
    subscriptionId: data.subscription_type_id || '',
    managerId: data.manager_id || '',
    customerSuccessId: '', // Handled separately via customer_success_owned_customers
    ownerId: data.owner_id || '',
    status: data.lifecycle_stage,
    subscriptionName: Array.isArray(subscription) ? subscription[0]?.name || '' : subscription?.name || '',
    manager: { id: '', name: '', email: '' }, // Manager is deprecated, use customerSuccess instead
    owner: owner ? (Array.isArray(owner) ? {
      id: owner[0]?.user_id || '',
      firstName: owner[0]?.full_name?.split(' ')[0] || '',
      lastName: owner[0]?.full_name?.split(' ').slice(1).join(' ') || '',
      email: owner[0]?.email || '',
    } : {
      id: owner.user_id,
      firstName: owner.full_name?.split(' ')[0] || '',
      lastName: owner.full_name?.split(' ').slice(1).join(' ') || '',
      email: owner.email || '',
    }) : { id: '', firstName: '', lastName: '' },
    numberOfUsers: undefined,
    customerSuccess,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as Customer;
}

export async function updateCustomer(payload: UpdateCustomerPayload): Promise<Customer> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('customers')
    .update({
      name: payload.name,
      email_domain: payload.email,
      subscription_type_id: payload.subscriptionId,
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
  // API call removed
  return [];
}

export async function addCustomerSuccessUser(customerId: string, userId: string): Promise<void> {
  // API call removed
  throw new Error('API calls removed');
}

export async function removeCustomerSuccessUser(customerId: string, userId: string): Promise<void> {
  // API call removed
  throw new Error('API calls removed');
}

export async function updateCustomerSuccessUsers(customerId: string, userIds: string[]): Promise<CustomerSuccessUser[]> {
  // API call removed
  return [];
}