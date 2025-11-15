import { SystemUser, SystemRoleObject } from '@/contexts/auth/types';
import { createClient } from '@/lib/supabase/client';

interface SystemRoleData {
  user_system_role_id: string;
  name: string;
  display_name: string | null;
}

interface UserWithSystemRole {
  user_id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  customer_id: string | null;
  user_system_role_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_system_role: SystemRoleData | SystemRoleData[] | null;
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
  roleFilter?: string;
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

export async function createSystemUser(payload: CreateUserPayload): Promise<SystemUser> {
  // API call removed
  throw new Error('API calls removed');
}

export async function updateSystemUser(payload: EditUserInfoPayload): Promise<SystemUser> {
  // API call removed
  throw new Error('API calls removed');
}

export async function getSystemRoles(): Promise<SystemRoleObject[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_system_roles')
    .select('user_system_role_id, name, display_name')
    .order('name');
  
  if (error) throw error;
  
  return (data || []).map(role => ({
    id: role.user_system_role_id,
    name: role.display_name || role.name,
  }));
}

export async function getSystemUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
  const supabase = createClient();
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Build the query with joins
  let query = supabase
    .from('users')
    .select(`
      user_id,
      auth_user_id,
      email,
      full_name,
      avatar_url,
      customer_id,
      user_system_role_id,
      status,
      created_at,
      updated_at,
      customer:customers!users_customer_id_fkey(customer_id, name),
      user_system_role:user_system_roles(user_system_role_id, name, display_name)
    `, { count: 'exact' })
    .not('user_system_role_id', 'is', null)  // Only system users
    .range(from, to);
  
  // Apply filters
  if (params.search) {
    query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }
  
  if (params.roleFilter) {
    query = query.eq('user_system_role_id', params.roleFilter);
  }
  
  if (params.customerId && params.customerId.length > 0) {
    query = query.in('customer_id', params.customerId);
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
    data: (data || []).map((user: UserWithSystemRole) => ({
      id: user.user_id,
      uid: user.auth_user_id,
      email: user.email,
      name: user.full_name || '',
      firstName: user.full_name?.split(' ')[0] || '',
      lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
      avatar: user.avatar_url || undefined,
      customerId: user.customer_id,
      managerId: '',
      systemRole: user.user_system_role ? (() => {
        const role = user.user_system_role;
        return Array.isArray(role) ? {
          id: role[0]?.user_system_role_id || '',
          name: role[0]?.display_name || role[0]?.name || '',
        } : {
          id: role.user_system_role_id,
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
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      user_id,
      auth_user_id,
      email,
      full_name,
      avatar_url,
      customer_id,
      user_system_role_id,
      status,
      created_at,
      updated_at,
      customer:customers!users_customer_id_fkey(customer_id, name),
      user_system_role:user_system_roles(user_system_role_id, name, display_name)
    `)
    .eq('user_id', id)
    .single();
  
  if (error) throw error;
  
  const systemRoleData = data.user_system_role as SystemRoleData | SystemRoleData[] | null;
  
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
    systemRole: systemRoleData ? (Array.isArray(systemRoleData) ? {
      id: systemRoleData[0]?.user_system_role_id || '',
      name: systemRoleData[0]?.display_name || systemRoleData[0]?.name || '',
    } : {
      id: systemRoleData.user_system_role_id,
      name: systemRoleData.display_name || systemRoleData.name,
    }) : undefined,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as SystemUser;
}

export async function resendInviteSystemUser(email: string): Promise<void> {
  // API call removed
  throw new Error('API calls removed');
}