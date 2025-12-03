import { Customer, TaxonomyItem } from "@/contexts/auth/types";
import { createClient } from "@/lib/supabase/client";
import { SYSTEM_ROLES } from "@/lib/user-utils";
import { supabaseDB } from "@/lib/supabase/database";

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

/**
 * Get system role IDs (SYSTEM_ADMINISTRATOR and CUSTOMER_SUCCESS)
 * These roles should be excluded from user counts
 */
async function getSystemRoleIds(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const { data: roles, error } = await supabase
    .from('roles')
    .select('role_id')
    .in('name', [SYSTEM_ROLES.SYSTEM_ADMINISTRATOR, SYSTEM_ROLES.CUSTOMER_SUCCESS]);

  if (error) {
    console.warn('Failed to fetch system role IDs:', error);
    return [];
  }

  return (roles || []).map((role) => role.role_id);
}

/**
 * Count users for a customer (excluding system roles, including users with no role)
 * This matches the backend logic in customers.service.ts
 * 
 * Counts users where:
 * - customer_id matches
 * - deleted_at is null
 * - role_id is null OR role_id is not in systemRoleIds (SYSTEM_ADMINISTRATOR, CUSTOMER_SUCCESS)
 */
async function countUsersForCustomer(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  systemRoleIds: string[]
): Promise<number> {
  try {
    // Fetch all users for this customer (excluding deleted)
    // We need to filter by role_id, so we fetch minimal data and filter in memory
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('user_id, role_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null);

    if (error) {
      console.warn(`Failed to count users for customer ${customerId}:`, error);
      return 0;
    }

    if (!allUsers || allUsers.length === 0) {
      return 0;
    }

    // Filter: role_id is null OR role_id is not in systemRoleIds
    // This matches the backend logic: exclude system_admin and customer_success roles
    const filteredUsers = allUsers.filter(
      (user) => !user.role_id || !systemRoleIds.includes(user.role_id)
    );

    return filteredUsers.length;
  } catch (error) {
    console.warn(`Failed to count users for customer ${customerId}:`, error);
    return 0;
  }
}

// Helper function to validate customer success user
async function validateCSUser(supabase: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('user_id, role_id, deleted_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();
  
  if (userError || !user) {
    throw new Error(`Customer success user not found with ID: ${userId}`);
  }
  
  if (!user.role_id) {
    throw new Error('User must have a customer success role');
  }
  
  // Get the role to check if it's customer success
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('name')
    .eq('role_id', user.role_id)
    .single();
  
  if (roleError || !role) {
    throw new Error('Role not found');
  }
  
  if (role.name !== SYSTEM_ROLES.CUSTOMER_SUCCESS) {
    throw new Error('User must have a customer success role');
  }
}

// Helper function to get customer admin role ID
async function getCustomerAdminRoleId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data, error } = await supabase
    .from('roles')
    .select('role_id')
    .eq('name', SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR)
    .maybeSingle();
  
  if (error) {
    console.error('Failed to find customer_admin role:', error);
    return null;
  }
  
  return data?.role_id || null;
}

// Helper function to get standard user role ID
async function getStandardUserRoleId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data, error } = await supabase
    .from('roles')
    .select('role_id')
    .eq('name', SYSTEM_ROLES.STANDARD_USER)
    .maybeSingle();
  
  if (error) {
    console.error('Failed to find standard_user role:', error);
    return null;
  }
  
  return data?.role_id || null;
}

// Helper function to get domain from email
function getDomainFromEmail(email: string): string {
  if (!email) return '';
  const trimmed = email.trim().toLowerCase();
  const domainRegex = /@([^@\s]+)$/;
  const match = domainRegex.exec(trimmed);
  return match ? (match[1] || '') : '';
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  const supabase = createClient();
  
  // Validate owner exists
  if (!payload.ownerId) {
    throw new Error('Owner ID is required');
  }
  
  const { data: owner, error: ownerError } = await supabase
    .from('users')
    .select('user_id, email, role_id, deleted_at')
    .eq('user_id', payload.ownerId)
    .is('deleted_at', null)
    .single();
  
  if (ownerError || !owner) {
    throw new Error('Owner not found');
  }
  
  // Validate all customer success users if provided
  if (payload.customerSuccessIds && payload.customerSuccessIds.length > 0) {
    for (const csId of payload.customerSuccessIds) {
      await validateCSUser(supabase, csId);
    }
  }
  
  // Create customer
  const { data: customer, error: createError } = await supabase
    .from('customers')
    .insert({
      name: payload.name,
      subscription_type_id: payload.subscriptionId || null,
      email_domain: getDomainFromEmail(owner.email),
      owner_id: payload.ownerId,
      lifecycle_stage: 'onboarding',
      active: true,
    })
    .select('customer_id')
    .single();
  
  if (createError || !customer) {
    throw new Error(createError?.message || 'Failed to create customer');
  }
  
  // Set owner's customer_id and role
  const updateData: { customer_id: string; role_id?: string } = { customer_id: customer.customer_id };
  
  // If owner doesn't have a role, assign customer admin role
  if (!owner.role_id) {
    const customerAdminRoleId = await getCustomerAdminRoleId(supabase);
    if (customerAdminRoleId) {
      updateData.role_id = customerAdminRoleId;
    }
  }
  
  const { error: updateOwnerError } = await supabase
    .from('users')
    .update(updateData)
    .eq('user_id', payload.ownerId)
    .is('deleted_at', null);
  
  if (updateOwnerError) {
    console.error('Failed to update owner:', updateOwnerError);
  }
  
  // Create customer success assignments if provided
  if (payload.customerSuccessIds && payload.customerSuccessIds.length > 0) {
    for (const csId of payload.customerSuccessIds) {
      // Create assignment
      const { error: csError } = await supabase
        .from('customer_success_owned_customers')
        .insert({
          user_id: csId,
          customer_id: customer.customer_id,
        });
      
      if (csError) {
        console.error('Failed to create customer success assignment:', csError);
      }
      
      // If user has no customer_id, set it
      const { data: user } = await supabase
        .from('users')
        .select('customer_id')
        .eq('user_id', csId)
        .is('deleted_at', null)
        .single();
      
      if (user && !user.customer_id) {
        await supabase
          .from('users')
          .update({ customer_id: customer.customer_id })
          .eq('user_id', csId)
          .is('deleted_at', null);
      }
    }
  }
  
  // Fetch and return created customer
  return getCustomerById(customer.customer_id);
}

export async function getCustomers(): Promise<TaxonomyItem[]> {
  const supabase = createClient();
  
  // Get current user (returns impersonated user when impersonating)
  const currentUser = await supabaseDB.getCurrentUser();
  
  // Check if user is customer success
  const userRoleName = currentUser.role?.name;
  const isCS = userRoleName === SYSTEM_ROLES.CUSTOMER_SUCCESS;
  
  let query = supabase
    .from('customers')
    .select('customer_id, name')
    .order('name');
  
  // Filter by assigned customers if user is customer success
  if (isCS && currentUser.user_id) {
    // Get assigned customers from customer_success_owned_customers
    const { data: csAssignments, error: csError } = await supabase
      .from('customer_success_owned_customers')
      .select('customer_id')
      .eq('user_id', currentUser.user_id);
    
    if (csError) {
      throw csError;
    }
    
    // Extract customer IDs
    const assignedCustomerIds = (csAssignments || []).map((assignment: { customer_id: string }) => assignment.customer_id);
    
    // If no assigned customers, return empty array
    if (assignedCustomerIds.length === 0) {
      return [];
    }
    
    // Filter customers by assigned customer IDs
    query = query.in('customer_id', assignedCustomerIds);
  }
  
  const { data, error } = await query;
  
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
  
  // Get current user (returns impersonated user when impersonating)
  const currentUser = await supabaseDB.getCurrentUser();
  
  // Check if user is customer success
  const userRoleName = currentUser.role?.name;
  const isCS = userRoleName === SYSTEM_ROLES.CUSTOMER_SUCCESS;
  
  // Get assigned customer IDs if user is customer success
  let assignedCustomerIds: string[] | null = null;
  if (isCS && currentUser.user_id) {
    const { data: csAssignments, error: csError } = await supabase
      .from('customer_success_owned_customers')
      .select('customer_id')
      .eq('user_id', currentUser.user_id);
    
    if (csError) {
      throw csError;
    }
    
    assignedCustomerIds = (csAssignments || []).map((assignment: { customer_id: string }) => assignment.customer_id);
    
    // If no assigned customers, return empty result set
    if (assignedCustomerIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page: params.page || 1,
          lastPage: 1,
          perPage: params.perPage || 10,
          currentPage: params.page || 1,
          prev: null,
          next: null,
        },
      };
    }
  }
  
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
  
  // Filter by assigned customers if user is customer success
  if (assignedCustomerIds && assignedCustomerIds.length > 0) {
    query = query.in('customer_id', assignedCustomerIds);
  }
  
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

  // Get system role IDs for user counting (exclude system_admin and customer_success)
  const systemRoleIds = await getSystemRoleIds(supabase);

  // Calculate user counts for all customers in parallel
  const userCountPromises = customerIds.map((customerId) =>
    countUsersForCustomer(supabase, customerId, systemRoleIds)
  );
  const userCounts = await Promise.all(userCountPromises);
  const userCountMap = new Map<string, number>();
  customerIds.forEach((customerId, index) => {
    userCountMap.set(customerId, userCounts[index] ?? 0);
  });
  
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
        numberOfUsers: userCountMap.get(customer.customer_id) ?? 0,
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

  // Get system role IDs and calculate user count
  const systemRoleIds = await getSystemRoleIds(supabase);
  const numberOfUsers = await countUsersForCustomer(supabase, id, systemRoleIds);
  
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
    numberOfUsers,
    customerSuccess,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as Customer;
}

export async function updateCustomer(payload: UpdateCustomerPayload): Promise<Customer> {
  const supabase = createClient();
  
  // Get existing customer
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('customer_id, owner_id')
    .eq('customer_id', payload.id)
    .single();
  
  if (fetchError || !customer) {
    throw new Error(`Customer with ID ${payload.id} not found`);
  }
  
  const { name, subscriptionId, ownerId, customerSuccessIds } = payload;
  
  // Handle customer success assignments if provided
  if (customerSuccessIds !== undefined) {
    // Validate all CS users
    for (const userId of customerSuccessIds) {
      await validateCSUser(supabase, userId);
    }
    
    // Get existing assignments
    const { data: existingAssignments, error: existingError } = await supabase
      .from('customer_success_owned_customers')
      .select('user_id')
      .eq('customer_id', payload.id);
    
    if (existingError) {
      console.error('Failed to get existing assignments:', existingError);
    }
    
    const existingUserIds = (existingAssignments || []).map((a: { user_id: string }) => a.user_id);
    
    // Determine which assignments to add and remove
    const toAdd = customerSuccessIds.filter(
      (userId) => !existingUserIds.includes(userId),
    );
    const toRemove = existingUserIds.filter(
      (userId: string) => !customerSuccessIds.includes(userId),
    );
    
    // Remove old assignments (do NOT modify user's customer_id)
    for (const userId of toRemove) {
      const { error: removeError } = await supabase
        .from('customer_success_owned_customers')
        .delete()
        .eq('user_id', userId)
        .eq('customer_id', payload.id);
      
      if (removeError) {
        console.error('Failed to remove assignment:', removeError);
      }
    }
    
    // Add new assignments
    for (const userId of toAdd) {
      // Create assignment
      const { error: csError } = await supabase
        .from('customer_success_owned_customers')
        .insert({
          user_id: userId,
          customer_id: payload.id,
        });
      
      if (csError) {
        console.error('Failed to create customer success assignment:', csError);
      }
      
      // If user has no customer_id, set it
      const { data: user } = await supabase
        .from('users')
        .select('customer_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single();
      
      if (user && !user.customer_id) {
        await supabase
          .from('users')
          .update({ customer_id: payload.id })
          .eq('user_id', userId)
          .is('deleted_at', null);
      }
    }
  }
  
  // Handle owner update if provided
  let ownerEmail: string | undefined;
  if (ownerId && ownerId !== customer.owner_id) {
    const { data: owner, error: ownerError } = await supabase
      .from('users')
      .select('user_id, email, role_id')
      .eq('user_id', ownerId)
      .is('deleted_at', null)
      .single();
    
    if (ownerError || !owner) {
      throw new Error('Owner not found');
    }
    
    ownerEmail = owner.email;
    
    // Update old owner: set role_id to Standard user role
    if (customer.owner_id) {
      const standardUserRoleId = await getStandardUserRoleId(supabase);
      const updateData: { role_id: string | null } = { role_id: standardUserRoleId || null };
      
      await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', customer.owner_id)
        .is('deleted_at', null);
    }
    
    // Update new owner: set customer_id and role (if no role)
    const newOwnerUpdateData: { customer_id: string; role_id?: string } = { customer_id: payload.id };
    
    if (!owner.role_id) {
      const customerAdminRoleId = await getCustomerAdminRoleId(supabase);
      if (customerAdminRoleId) {
        newOwnerUpdateData.role_id = customerAdminRoleId;
      }
    }
    
    await supabase
      .from('users')
      .update(newOwnerUpdateData)
      .eq('user_id', ownerId)
      .is('deleted_at', null);
  }
  
  // Build update data
  const updateData: { name?: string; subscription_type_id?: string; owner_id?: string; email_domain?: string } = {};
  if (name !== undefined) updateData.name = name;
  if (subscriptionId !== undefined) updateData.subscription_type_id = subscriptionId;
  if (ownerId !== undefined) updateData.owner_id = ownerId;
  if (ownerEmail !== undefined) updateData.email_domain = getDomainFromEmail(ownerEmail);
  
  // Remove undefined fields
  (Object.keys(updateData) as Array<keyof typeof updateData>).forEach(
    (key) => updateData[key] === undefined && delete updateData[key],
  );
  
  // Update customer
  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('customers')
      .update(updateData)
      .eq('customer_id', payload.id);
    
    if (updateError) throw updateError;
  }
  
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
  const supabase = createClient();
  
  // Validate customer exists
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('customer_id', customerId)
    .single();
  
  if (customerError || !customer) {
    throw new Error(`Customer with ID ${customerId} not found`);
  }
  
  // Get CS assignments for this customer
  const { data: csData, error: csError } = await supabase
    .from('customer_success_owned_customers')
    .select(`
      user_id,
      users!customer_success_owned_customers_user_id_fkey(user_id, full_name, email, avatar_url)
    `)
    .eq('customer_id', customerId);
  
  if (csError) {
    throw new Error(csError.message || 'Failed to fetch customer success users');
  }
  
  if (!csData || csData.length === 0) {
    return [];
  }
  
  // Map assignments to CustomerSuccessUser format
  const result: CustomerSuccessUser[] = [];
  
  for (const assignment of csData) {
    const user = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users;
    if (user) {
      result.push({
        id: user.user_id,
        name: user.full_name || '',
        email: user.email || '',
        avatarUrl: user.avatar_url || undefined,
      });
    }
  }
  
  return result;
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