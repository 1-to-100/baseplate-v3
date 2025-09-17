import { config } from '@/config';
import { apiFetch } from './api-fetch';
import { ApiUser, Status } from '@/contexts/auth/types';

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
  customerId?: number;
  roleId?: number;
  managerId?: number;
  status?: 'active' | 'inactive' | 'suspended';
}

interface UpdateUserPayload extends Partial<CreateUserPayload> {
  id: number;
}

interface EditUserInfoPayload extends Partial<CreateUserPayload> {
  firstName: string;
  lastName: string;
}

export interface GetUsersParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  roleId?: number[];
  customerId?: number[];
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
  customerId: number;
  roleId: number;
}

interface InviteMultipleUsersPayload {
  emails: string[];
  customerId: number;
  roleId: number;
}

export async function validateEmail(email: string): Promise<boolean> {
  const validateEmailUrl = `${config.site.apiUrl}/register/validate-email/${encodeURIComponent(email)}`;
  const response = await fetch(validateEmailUrl, {
    method: "GET",
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
  const response = await fetch(`${config.site.apiUrl}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const errorMessage = errorData.message
      || `Failed to reset password: ${response.statusText}`
      || 'An error occurred during password reset';
    throw new Error(errorMessage);
  }

  return response.json() as Promise<{status: string, message: string}>;
}

export async function registerUser(payload: RegisterUserPayload): Promise<ApiUser> {
  const response = await fetch(`${config.site.apiUrl}/register`, {
    method: "POST",
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
  return apiFetch<ApiUser>(`${config.site.apiUrl}/users/${payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getUsers(params: GetUsersParams = {}): Promise<GetUsersResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.perPage) query.set('perPage', params.perPage.toString());
  if (params.search) query.set('search', params.search);
  if (params.orderBy) query.set('orderBy', params.orderBy);
  if (params.orderDirection) query.set('orderDirection', params.orderDirection);
  
  if (params.roleId && params.roleId.length > 0) {
    params.roleId.forEach(id => query.append('roleId', id.toString()));
  }
  if (params.customerId && params.customerId.length > 0) {
    params.customerId.forEach(id => query.append('customerId', id.toString()));
  }
  if (params.statusId && params.statusId.length > 0) {
    params.statusId.forEach(status => query.append('status', status));
  }
  if (params.hasCustomer !== undefined) {
    query.set('hasCustomer', params.hasCustomer.toString());
  }

  return apiFetch<GetUsersResponse>(`${config.site.apiUrl}/users?${query.toString()}`, {
    method: 'GET',
  });
}

export async function getUserById(id: number): Promise<ApiUser> {
  return apiFetch<ApiUser>(`${config.site.apiUrl}/users/${id}`, {
    method: 'GET',
  });
}

export async function getUserInfo(): Promise<ApiUser> {
  return apiFetch<ApiUser>(`${config.site.apiUrl}/users/me`, {
    method: 'GET',
  });
}

export async function editUserInfo(payload: EditUserInfoPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>(`${config.site.apiUrl}/users/me`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: number): Promise<ApiUser> {
  return apiFetch<ApiUser>(`${config.site.apiUrl}/users/${id}`, {
    method: 'DELETE',
  });
}

export async function getStatuses(): Promise<Status[]> {
  return apiFetch<Status[]>(`${config.site.apiUrl}/taxonomies/statuses`, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });
}

export async function inviteUser(payload: InviteUserPayload): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/users/invite`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resendInviteUser(email: string): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/users/resend-invite`, {
    method: 'POST',
    body: JSON.stringify({email}),
  });
}

export async function inviteMultipleUsers(payload: InviteMultipleUsersPayload): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/users/invite-multiple`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}