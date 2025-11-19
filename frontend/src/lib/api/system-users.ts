import { SystemUser, SystemRoleObject } from '@/contexts/auth/types';
import { createClient } from '@/lib/supabase/client';
import { SYSTEM_ROLES } from '@/lib/user-utils';
import { supabaseDB } from '@/lib/supabase/database';
import { edgeFunctions } from '@/lib/supabase/edge-functions';

interface RoleData {
  role_id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  is_system_role: boolean;
}

interface UserWithRole {
  user_id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  customer_id: string | null;
  role_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  role: RoleData | RoleData[] | null;
}



interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  customerId?: string;
  status?: 'active' | 'inactive';
  systemRole: string;
}

interface UpdateUserPayload extends Partial<CreateUserPayload> {
  id: string;
}

interface EditUserInfoPayload extends Partial<CreateUserPayload> {
  id: string;
  firstName: string;
  lastName: string;
  customerId?: string;
  status?: 'active' | 'inactive';
  systemRole: string;
}

export interface GetUsersParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  roleId?: string[];
  customerId?: string[];
  statusId?: string[];
}

interface GetUsersResponse {
  data: SystemUser[]; 
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

// Helper function to get role ID by name
async function getRoleIdByName(roleName: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('roles')
    .select('role_id')
    .eq('name', roleName)
    .maybeSingle();
  
  if (error) {
    console.error(`Failed to find role ${roleName}:`, error);
    return null;
  }
  
  if (!data) {
    console.error(`Role ${roleName} not found in database`);
    return null;
  }
  
  return data.role_id;
}

export async function createSystemUser(payload: CreateUserPayload): Promise<SystemUser> {
  const supabase = createClient();
  const fullName = `${payload.firstName} ${payload.lastName}`.trim();
  
  // Validate system role
  const isSystemAdmin = payload.systemRole === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR;
  const isCustomerSuccess = payload.systemRole === SYSTEM_ROLES.CUSTOMER_SUCCESS;
  
  if (!isSystemAdmin && !isCustomerSuccess) {
    throw new Error('Invalid system role. Must be system_admin or customer_success');
  }
  
  // Check if email already exists
  const emailExists = await supabaseDB.checkEmailExists(payload.email);
  if (emailExists) {
    throw new Error('User with this email already exists');
  }
  
  // Validate customer if customer_success
  if (isCustomerSuccess && payload.customerId) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('customer_id')
      .eq('customer_id', payload.customerId)
      .maybeSingle();
    
    if (customerError || !customer) {
      throw new Error('Customer not found');
    }
  }
  
  // Get role ID by name
  const roleId = await getRoleIdByName(payload.systemRole);
  if (!roleId) {
    throw new Error(`Role ${payload.systemRole} not found`);
  }
  
  // Create user in database
  const { data: userData, error: createError } = await supabase
    .from('users')
    .insert({
      email: payload.email,
      full_name: fullName,
      customer_id: payload.customerId || null,
      role_id: roleId,
      status: payload.status || 'inactive',
    })
    .select(`
      user_id,
      auth_user_id,
      email,
      full_name,
      avatar_url,
      customer_id,
      role_id,
      status,
      created_at,
      updated_at,
      role:roles(role_id, name, display_name, description, is_system_role)
    `)
    .single();
  
  if (createError || !userData) {
    throw new Error(createError?.message || 'Failed to create user');
  }
  
  // If customer_success and has customerId, create entry in customer_success_owned_customers
  if (isCustomerSuccess && payload.customerId) {
    const { error: csError } = await supabase
      .from('customer_success_owned_customers')
      .insert({
        user_id: userData.user_id,
        customer_id: payload.customerId,
      });
    
    if (csError) {
      console.error('Failed to create customer success assignment:', csError);
      // Don't throw - user is created, assignment can be fixed later
    }
  }
  
  // Use edge function to create auth user and send invite email
  if (payload.customerId) {
    try {
      await edgeFunctions.inviteUser({
        email: payload.email,
        customerId: payload.customerId,
        roleId: roleId,
        fullName: fullName,
      });
    } catch (inviteError) {
      console.error('Failed to send invite email:', inviteError);
      // Don't throw - user is created, invite can be resent later
    }
  }
  
  // Map to SystemUser format
  const role = userData.role as RoleData | RoleData[] | null;
  
  return {
    id: userData.user_id,
    uid: userData.auth_user_id || '',
    email: userData.email,
    name: userData.full_name || '',
    firstName: payload.firstName,
    lastName: payload.lastName,
    avatar: userData.avatar_url || undefined,
    customerId: userData.customer_id,
    managerId: '',
    role: role ? (Array.isArray(role) ? {
      id: role[0]?.role_id || '',
      name: role[0]?.display_name || role[0]?.name || '',
    } : {
      id: role.role_id,
      name: role.display_name || role.name,
    }) : undefined,
    status: userData.status,
    createdAt: userData.created_at,
    updatedAt: userData.updated_at,
  } as SystemUser;
}

export async function updateSystemUser(payload: EditUserInfoPayload): Promise<SystemUser> {
  const supabase = createClient();
  const fullName = `${payload.firstName} ${payload.lastName}`.trim();
  
  // Validate system role
  const isSystemAdmin = payload.systemRole === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR;
  const isCustomerSuccess = payload.systemRole === SYSTEM_ROLES.CUSTOMER_SUCCESS;
  
  if (!isSystemAdmin && !isCustomerSuccess) {
    throw new Error('Invalid system role. Must be system_admin or customer_success');
  }
  
  // Get current user to check existing role
  const { data: currentUser, error: fetchError } = await supabase
    .from('users')
    .select('role_id, customer_id')
    .eq('user_id', payload.id)
    .single();
  
  if (fetchError || !currentUser) {
    throw new Error('User not found');
  }
  
  // Get new role ID
  const newRoleId = await getRoleIdByName(payload.systemRole);
  if (!newRoleId) {
    throw new Error(`Role ${payload.systemRole} not found`);
  }
  
  // Validate customer if customer_success
  if (isCustomerSuccess && payload.customerId) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('customer_id')
      .eq('customer_id', payload.customerId)
      .maybeSingle();
    
    if (customerError || !customer) {
      throw new Error('Customer not found');
    }
  }
  
  // Update user
  const { data: userData, error: updateError } = await supabase
    .from('users')
    .update({
      email: payload.email,
      full_name: fullName,
      customer_id: payload.customerId || null,
      role_id: newRoleId,
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', payload.id)
    .select(`
      user_id,
      auth_user_id,
      email,
      full_name,
      avatar_url,
      customer_id,
      role_id,
      status,
      created_at,
      updated_at,
      role:roles(role_id, name, display_name, description, is_system_role)
    `)
    .single();
  
  if (updateError || !userData) {
    throw new Error(updateError?.message || 'Failed to update user');
  }
  
  // Handle customer_success_owned_customers
  if (isCustomerSuccess && payload.customerId) {
    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('customer_success_owned_customers')
      .select('customer_success_owned_customer_id')
      .eq('user_id', payload.id)
      .eq('customer_id', payload.customerId)
      .maybeSingle();
    
    if (!existingAssignment) {
      // Create new assignment
      const { error: csError } = await supabase
        .from('customer_success_owned_customers')
        .insert({
          user_id: payload.id,
          customer_id: payload.customerId,
        });
      
      if (csError) {
        console.error('Failed to create customer success assignment:', csError);
      }
    }
  } else {
    // If not customer_success or no customerId, remove all assignments
    await supabase
      .from('customer_success_owned_customers')
      .delete()
      .eq('user_id', payload.id);
  }
  
  // Map to SystemUser format
  const role = userData.role as RoleData | RoleData[] | null;
  
  return {
    id: userData.user_id,
    uid: userData.auth_user_id || '',
    email: userData.email,
    name: userData.full_name || '',
    firstName: payload.firstName,
    lastName: payload.lastName,
    avatar: userData.avatar_url || undefined,
    customerId: userData.customer_id,
    managerId: '',
    role: role ? (Array.isArray(role) ? {
      id: role[0]?.role_id || '',
      name: role[0]?.display_name || role[0]?.name || '',
    } : {
      id: role.role_id,
      name: role.display_name || role.name,
    }) : undefined,
    status: userData.status,
    createdAt: userData.created_at,
    updatedAt: userData.updated_at,
  } as SystemUser;
}

/**
 * Get system role IDs (SYSTEM_ADMINISTRATOR and CUSTOMER_SUCCESS)
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

export async function getSystemRoles(): Promise<SystemRoleObject[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('roles')
    .select('role_id, name, display_name, is_system_role')
    .eq('is_system_role', true)
    .in('name', [SYSTEM_ROLES.SYSTEM_ADMINISTRATOR, SYSTEM_ROLES.CUSTOMER_SUCCESS])
    .order('name');
  
  if (error) throw error;
  
  return (data || []).map(role => ({
    id: role.role_id,
    name: role.display_name || role.name,
  }));
}

export async function getSystemUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
  const supabase = createClient();
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Get system role IDs to filter by
  const systemRoleIds = await getSystemRoleIds(supabase);
  if (systemRoleIds.length === 0) {
    // If no system roles found, return empty result
    return {
      data: [],
      meta: {
        total: 0,
        page,
        lastPage: 0,
        perPage,
        currentPage: page,
        prev: null,
        next: null,
      },
    };
  }
  
  // If roleId filter is provided, intersect with system role IDs
  // (only show system roles that match the filter)
  const roleIdsToFilter = params.roleId && params.roleId.length > 0
    ? systemRoleIds.filter(id => params.roleId!.includes(id))
    : systemRoleIds;
  
  if (roleIdsToFilter.length === 0) {
    // If intersection is empty, return empty result
    return {
      data: [],
      meta: {
        total: 0,
        page,
        lastPage: 0,
        perPage,
        currentPage: page,
        prev: null,
        next: null,
      },
    };
  }
  
  // Build the query with joins - matching backend structure
  let query = supabase
    .from('users')
    .select(`
      user_id,
      auth_user_id,
      email,
      full_name,
      avatar_url,
      customer_id,
      role_id,
      status,
      created_at,
      updated_at,
      deleted_at,
      customer:customers!users_customer_id_fkey(customer_id, name, owner_id),
      role:roles(role_id, name, display_name, description, is_system_role)
    `, { count: 'exact' })
    .in('role_id', roleIdsToFilter) // Filter by system role IDs (intersected with filter if provided)
    .is('deleted_at', null); // Exclude deleted users
  
  // Apply filters
  if (params.search) {
    query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }
  
  if (params.customerId && params.customerId.length > 0) {
    query = query.in('customer_id', params.customerId);
  }
  
  if (params.statusId && params.statusId.length > 0) {
    query = query.in('status', params.statusId);
  }
  
  // Apply sorting - map 'name' to 'full_name' since users table doesn't have 'name' column
  const validOrderColumns = ['user_id', 'auth_user_id', 'email', 'full_name', 'avatar_url', 'customer_id', 'role_id', 'status', 'created_at', 'updated_at'];
  let orderBy = params.orderBy || 'created_at';
  // Map 'name' to 'full_name' for users table
  if (orderBy === 'name') {
    orderBy = 'full_name';
  }
  // Only allow valid columns
  if (!validOrderColumns.includes(orderBy)) {
    orderBy = 'created_at';
  }
  const orderDirection = params.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });
  
  // Apply pagination
  query = query.range(from, to);
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);
  
  return {
    data: (data || []).map((user: UserWithRole) => ({
      id: user.user_id,
      uid: user.auth_user_id,
      email: user.email,
      name: user.full_name || '',
      firstName: user.full_name?.split(' ')[0] || '',
      lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
      avatar: user.avatar_url || undefined,
      customerId: user.customer_id,
      managerId: '',
      role: user.role ? (() => {
        const role = user.role;
        return Array.isArray(role) ? {
          id: role[0]?.role_id || '',
          name: role[0]?.display_name || role[0]?.name || '',
        } : {
          id: role.role_id,
          name: role.display_name || role.name,
        };
      })() : undefined,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    })) as SystemUser[],
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

export async function getSystemUserById(id: string): Promise<SystemUser> {
  const supabase = createClient();
  
  // Get system role IDs to filter by
  const systemRoleIds = await getSystemRoleIds(supabase);
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      user_id,
      auth_user_id,
      email,
      full_name,
      avatar_url,
      customer_id,
      role_id,
      status,
      created_at,
      updated_at,
      deleted_at,
      customer:customers!users_customer_id_fkey(customer_id, name, owner_id),
      role:roles(role_id, name, display_name, description, is_system_role)
    `)
    .eq('user_id', id)
    .in('role_id', systemRoleIds)
    .is('deleted_at', null)
    .single();
  
  if (error) throw error;
  
  const roleData = data.role as RoleData | RoleData[] | null;
  
  return {
    id: data.user_id,
    uid: data.auth_user_id,
    email: data.email,
    name: data.full_name || '',
    firstName: data.full_name?.split(' ')[0] || '',
    lastName: data.full_name?.split(' ').slice(1).join(' ') || '',
    avatar: data.avatar_url || undefined,
    customerId: data.customer_id,
    managerId: '',
    role: roleData ? (Array.isArray(roleData) ? {
      id: roleData[0]?.role_id || '',
      name: roleData[0]?.display_name || roleData[0]?.name || '',
    } : {
      id: roleData.role_id,
      name: roleData.display_name || roleData.name,
    }) : undefined,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as SystemUser;
}

export async function resendInviteSystemUser(email: string): Promise<void> {
  await edgeFunctions.resendInvite(email);
}