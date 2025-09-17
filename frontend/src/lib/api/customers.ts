import { config } from "@/config";
import { apiFetch } from "./api-fetch";
import { Customer } from "@/contexts/auth/types";

interface GetCustomersParams {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  managerId?: number[];
  subscriptionId?: number[];
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
  subscriptionId?: number;
  managerId?: number;
  ownerId?: number;
}

interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  id: number;
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  return apiFetch<Customer>(`${config.site.apiUrl}/customers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCustomers(): Promise<Customer[]> {
  return apiFetch<Customer[]>(`${config.site.apiUrl}/taxonomies/customers`, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });
}

export async function getSubscriptions(): Promise<Customer[]> {
  return apiFetch<Customer[]>(`${config.site.apiUrl}/taxonomies/subscriptions`, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });
}

export async function getCustomersList(params: GetCustomersParams = {}): Promise<GetCustomersResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.perPage) query.set('perPage', params.perPage.toString());
  if (params.search) query.set('search', params.search);
  if (params.orderBy) query.set('orderBy', params.orderBy);
  if (params.orderDirection) query.set('orderDirection', params.orderDirection);

  if (params.managerId && params.managerId.length > 0) {
    params.managerId.forEach(id => query.append('customerSuccessId', id.toString()));
  }
  if (params.subscriptionId && params.subscriptionId.length > 0) {
    params.subscriptionId.forEach(id => query.append('subscriptionId', id.toString()));
  }
  if (params.statusId && params.statusId.length > 0) {
    params.statusId.forEach(status => query.append('status', status));
  }

  return apiFetch<GetCustomersResponse>(`${config.site.apiUrl}/customers?${query.toString()}`, {
    method: 'GET',
  });
}

export async function getCustomerById(id: number): Promise<Customer> {
  return apiFetch<Customer>(`${config.site.apiUrl}/customers/${id}`, {
    method: 'GET',
  });
}

export async function updateCustomer(payload: UpdateCustomerPayload): Promise<Customer> {
  return apiFetch<Customer>(`${config.site.apiUrl}/customers/${payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomer(id: number): Promise<Customer> {
  return apiFetch<Customer>(`${config.site.apiUrl}/customers/${id}`, {
    method: 'DELETE',
  });
}