import { config } from '@/config';
import { apiFetch } from './api-fetch';
import { ApiUser, Status } from '@/contexts/auth/types';
import { createClient } from '@/lib/supabase/client';
import { supabaseDB } from '@/lib/supabase/database';
import { edgeFunctions } from '@/lib/supabase/edge-functions';

interface RegisterUserPayload {
  firstName: string,
  lastName: string,
  email: string,
  password: string
}

interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  customerId?: string;
  roleId?: string;
  managerId?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

interface UpdateUserPayload extends Partial<CreateUserPayload> {
  id: string;
}

interface EditUserInfoPayload extends Partial<CreateUserPayload> {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
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
  hasCustomer?: boolean;
}

interface GetUsersResponse {
  data: ApiUser[]; 
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

interface InviteUserPayload {
  email: string;
  customerId: string;
  roleId?: string;
}

interface InviteMultipleUsersPayload {
  emails: string[];
  customerId: string;
  roleId?: string;
}

export async function validateEmail(email: string): Promise<boolean> {
  const validateEmailUrl = `${config.site.apiUrl}/register/validate-email/${encodeURIComponent(email)}`;
  const response = await fetch(validateEmailUrl, {
    method: "GET",
    credentials: 'include',
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.message
      || `Failed to validate email: ${response.statusText}`
      || 'An error occurred during email validation';
    throw new Error(errorMessage);
  }

  return true;
}

export async function resetPassword(email: string): Promise<{status: string, message: string}> {
  const supabase = createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback`,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send password reset email');
  }

  return {
    status: 'success',
    message: 'Password reset email sent successfully'
  };
}

export async function registerUser(payload: RegisterUserPayload): Promise<ApiUser> {
  const response = await fetch(`${config.site.apiUrl}/register`, {
    method: "POST",
    credentials: 'include',
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      password: payload.password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.message
      || `Failed to register user: ${response.statusText}`
      || 'An error occurred during registration';
    throw new Error(errorMessage);
  }

  return response.json() as Promise<ApiUser>;
}

export async function createUser(payload: CreateUserPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>(`${config.site.apiUrl}/users`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(payload: UpdateUserPayload): Promise<ApiUser> {
  const supabase = createClient();
  
  const fullName = payload.firstName && payload.lastName 
    ? `${payload.firstName} ${payload.lastName}`.trim() 
    : undefined;
  
  const { error } = await supabase
    .from('users')
    .update({
      full_name: fullName,
      email: payload.email,
      customer_id: payload.customerId,
      role_id: payload.roleId,
      manager_id: payload.managerId,
      status: payload.status,
    })
    .eq('user_id', payload.id);
  
  if (error) throw error;
  
  // Fetch and return updated user
  return getUserById(payload.id);
}

export async function getUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
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
      email_verified,
      full_name,
      phone_number,
      avatar_url,
      customer_id,
      role_id,
      manager_id,
      status,
      created_at,
      updated_at,
      deleted_at,
      customer:customers(customer_id, name, domain),
      role:roles(role_id, name, display_name)
    `, { count: 'exact' })
    .range(from, to);
  
  // Apply filters
  if (params.search) {
    query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }
  
  if (params.roleId && params.roleId.length > 0) {
    query = query.in('role_id', params.roleId);
  }
  
  if (params.customerId && params.customerId.length > 0) {
    query = query.in('customer_id', params.customerId);
  }
  
  if (params.statusId && params.statusId.length > 0) {
    query = query.in('status', params.statusId);
  }
  
  if (params.hasCustomer !== undefined) {
    if (params.hasCustomer) {
      query = query.not('customer_id', 'is', null);
    } else {
      query = query.is('customer_id', null);
    }
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
    data: (data || []).map((user: any) => ({
      id: user.user_id,
      uid: user.auth_user_id,
      email: user.email,
      emailVerified: user.email_verified,
      name: user.full_name || '',
      firstName: user.full_name?.split(' ')[0] || '',
      lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
      avatar: user.avatar_url || undefined,
      phoneNumber: user.phone_number || undefined,
      customerId: user.customer_id || undefined,
      roleId: user.role_id || undefined,
      managerId: user.manager_id || undefined,
      status: user.status as Status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      deletedAt: user.deleted_at || undefined,
      customer: user.customer ? {
        id: user.customer.customer_id,
        name: user.customer.name,
        domain: user.customer.domain,
      } : undefined,
      role: user.role ? {
        id: user.role.role_id,
        name: user.role.name,
        displayName: user.role.display_name,
      } : undefined,
    })) as ApiUser[],
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

export async function getUserById(id: string): Promise<ApiUser> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      user_id, 
      auth_user_id, 
      email, 
      email_verified,
      full_name,
      phone_number,
      avatar_url,
      customer_id,
      role_id,
      manager_id,
      status,
      created_at,
      updated_at,
      deleted_at,
      customer:customers(customer_id, name, domain),
      role:roles(role_id, name, display_name)
    `)
    .eq('user_id', id)
    .single();
  
  if (error) throw error;
  
  return {
    id: data.user_id,
    uid: data.auth_user_id,
    email: data.email,
    emailVerified: data.email_verified,
    name: data.full_name || '',
    firstName: data.full_name?.split(' ')[0] || '',
    lastName: data.full_name?.split(' ').slice(1).join(' ') || '',
    avatar: data.avatar_url || undefined,
    phoneNumber: data.phone_number || undefined,
    customerId: data.customer_id || undefined,
    roleId: data.role_id || undefined,
    managerId: data.manager_id || undefined,
    status: data.status as Status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    deletedAt: data.deleted_at || undefined,
    customer: data.customer ? {
      id: data.customer.customer_id,
      name: data.customer.name,
      domain: data.customer.domain,
    } : undefined,
    role: data.role ? {
      id: data.role.role_id,
      name: data.role.name,
      displayName: data.role.display_name,
    } : undefined,
  } as ApiUser;
}

export async function getUserInfo(): Promise<ApiUser> {
  const dbUser = await supabaseDB.getCurrentUser();
  
  // Map database response to API format
  return {
    id: dbUser.user_id,
    uid: dbUser.auth_user_id,
    email: dbUser.email,
    emailVerified: dbUser.email_verified,
    name: dbUser.full_name || '',
    firstName: dbUser.full_name?.split(' ')[0] || '',
    lastName: dbUser.full_name?.split(' ').slice(1).join(' ') || '',
    avatar: dbUser.avatar_url || undefined,
    phoneNumber: dbUser.phone_number || undefined,
    customerId: dbUser.customer_id || undefined,
    roleId: dbUser.role_id || undefined,
    managerId: dbUser.manager_id || undefined,
    status: dbUser.status as Status,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    deletedAt: dbUser.deleted_at || undefined,
    customer: dbUser.customer ? {
      id: dbUser.customer.customer_id,
      name: dbUser.customer.name,
      domain: dbUser.customer.domain,
    } : undefined,
    role: dbUser.role ? {
      id: dbUser.role.role_id,
      name: dbUser.role.name,
      displayName: dbUser.role.display_name,
    } : undefined,
  } as ApiUser;
}

export async function editUserInfo(payload: EditUserInfoPayload): Promise<ApiUser> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Get current user to find user_id
  const currentUser = await supabaseDB.getCurrentUser();
  
  // Update user with mapped fields
  const fullName = `${payload.firstName || ''} ${payload.lastName || ''}`.trim();
  await supabaseDB.updateUser(currentUser.user_id, {
    full_name: fullName || undefined,
    phone_number: payload.phoneNumber,
    avatar_url: payload.avatar,
  });
  
  // Fetch and return updated user
  return getUserInfo();
}

export async function deleteUser(id: string): Promise<ApiUser> {
  const supabase = createClient();
  
  // Fetch user before deletion
  const userToDelete = await getUserById(id);
  
  const { error } = await supabase
    .from('users')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'inactive',
    })
    .eq('user_id', id);
  
  if (error) throw error;
  
  return userToDelete;
}

export async function getStatuses(): Promise<Status[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('statuses')
    .select('status_id, name, display_name')
    .order('name');
  
  if (error) throw error;
  
  return (data || []).map((status: any) => ({
    id: status.status_id,
    name: status.display_name || status.name,
  })) as Status[];
}

export async function inviteUser(payload: InviteUserPayload): Promise<void> {
  await edgeFunctions.inviteUser({
    email: payload.email,
    customerId: payload.customerId,
    roleId: payload.roleId || '',
  });
}

export async function resendInviteUser(email: string): Promise<void> {
  await edgeFunctions.resendInvite(email);
}

export async function inviteMultipleUsers(payload: InviteMultipleUsersPayload): Promise<void> {
  await edgeFunctions.inviteMultipleUsers({
    emails: payload.emails,
    customerId: payload.customerId,
    roleId: payload.roleId || '',
  });
}