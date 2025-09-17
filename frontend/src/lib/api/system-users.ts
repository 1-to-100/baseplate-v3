import { config } from '@/config';
import { apiFetch } from './api-fetch';
import { SystemUser, SystemRole } from '@/contexts/auth/types';



interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  customerId?: number;
  status?: 'active' | 'inactive';
  systemRole: string;
}

interface UpdateUserPayload extends Partial<CreateUserPayload> {
  id: number;
}

interface EditUserInfoPayload extends Partial<CreateUserPayload> {
  id: number;
  firstName: string;
  lastName: string;
  customerId?: number;
  status?: 'active' | 'inactive';
  systemRole: string;
}

export interface GetUsersParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  isSuperadmin?: boolean;
  isCustomerSuccess?: boolean;
  customerId?: number[];
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
  return apiFetch<SystemUser>(`${config.site.apiUrl}/system-users`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSystemUser(payload: EditUserInfoPayload): Promise<SystemUser> {
  return apiFetch<SystemUser>(`${config.site.apiUrl}/system-users/${payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getSystemRoles(): Promise<SystemRole[]> {
  return apiFetch<SystemRole[]>(`${config.site.apiUrl}/taxonomies/user-system-roles`, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });
}

export async function getSystemUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.perPage) query.set('perPage', params.perPage.toString());
  if (params.search) query.set('search', params.search);
  if (params.orderBy) query.set('orderBy', params.orderBy);
  if (params.orderDirection) query.set('orderDirection', params.orderDirection);
  
  if (params.isSuperadmin) query.set('isSuperadmin', params.isSuperadmin.toString());
  if (params.isCustomerSuccess) query.set('isCustomerSuccess', params.isCustomerSuccess.toString());
  if (params.customerId && params.customerId.length > 0) {
    params.customerId.forEach(id => query.append('customerId', id.toString()));
  }
  if (params.statusId && params.statusId.length > 0) {
    params.statusId.forEach(status => query.append('status', status));
  }

  return apiFetch<GetUsersResponse>(`${config.site.apiUrl}/system-users?${query.toString()}`, {
    method: 'GET',
  });
}

export async function getSystemUserById(id: number): Promise<SystemUser> {
  return apiFetch<SystemUser>(`${config.site.apiUrl}/system-users/${id}`, {
    method: 'GET',
  });
}