import {apiFetch} from "@/lib/api/api-fetch";
import {config} from "@/config";
import { ApiNotification, NotificationType } from "@/contexts/auth/types";

export interface GetNotificationsParams {
  page?: number;
  perPage?: number;
  isRead?: boolean;
  type?: string;
  channel?: string;
  search?: string;
  orderBy?: string;
  orderDirection?: string;
}

export interface GetNotificationsResponse {
  data: ApiNotification[]; 
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


export interface CreateNotificationRequest {
  title: string;
  message: string;
  comment: string;
  type: string[];
  channel: string;
}

export interface SendNotificationRequest {
  customerId: number;
  userIds: number[];
}

export interface GetNotificationHistoryParams {
  page?: number;
  perPage?: number;
  search?: string;
  type?: string;
  channel?: string[];
  customer?: number;
  user?: number;
  orderBy?: string;
  orderDirection?: string;
}

export interface GetNotificationHistoryResponse {
  data: {
    id: number;
    title: string;
    message: string;
    type: string;
    channel: string;
    createdAt: string;
    User: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    };
    Customer: { 
      id: number;
      name: string;
    };
  }[];
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

export async function unreadNotificationsCount(): Promise<{count: number}> {
  return apiFetch<{count: number}>(`${config.site.apiUrl}/notifications/unread-count`, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });
}

export async function getNotifications(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString()); 
  if (params.perPage) query.set('perPage', params.perPage.toString());
  if (params.isRead) query.set('isRead', params.isRead.toString());
  if (params.type) query.set('type', params.type);
  if (params.channel) query.set('channel', params.channel);
  
  return apiFetch<GetNotificationsResponse>(`${config.site.apiUrl}/notifications?${query.toString()}`, {
    method: 'GET',
  });
}

export async function markNotificationAsRead(id: number): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/notifications/${id}`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/notifications/read-all`, {
    method: 'PATCH',
  });
}

export async function getNotificationTemplates(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString()); 
  if (params.perPage) query.set('perPage', params.perPage.toString());
  if (params.search) query.set('search', params.search);
  if (params.type) query.set('type', params.type);
  if (params.channel) query.set('channel', params.channel);
  
  return apiFetch<GetNotificationsResponse>(`${config.site.apiUrl}/notification/templates?${query.toString()}`, {
    method: 'GET',
  });
}

export async function createNotification(data: CreateNotificationRequest): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/notification/templates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getNotificationById(id: number): Promise<ApiNotification> {
  return apiFetch<ApiNotification>(`${config.site.apiUrl}/notification/templates/${id}`, {
    method: 'GET',
  });
}

export async function deleteNotification(id: number): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/notification/templates/${id}`, {
    method: 'DELETE',
  });
}

export async function editNotification(id: number, data: CreateNotificationRequest): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/notification/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function sendNotification(data: SendNotificationRequest, notificationTemplateId: number): Promise<void> {
  return apiFetch<void>(`${config.site.apiUrl}/notification/templates/send/${notificationTemplateId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getNotificationsTypes(): Promise<NotificationType> {
  return apiFetch<NotificationType>(`${config.site.apiUrl}/taxonomies/notifications`, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });
}

export async function getNotificationsHistory(params: GetNotificationHistoryParams = {}): Promise<GetNotificationHistoryResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.perPage) query.set('perPage', params.perPage.toString());
  if (params.search) query.set('search', params.search);
  if (params.type) query.set('type', params.type);
  if (params.channel) {
    params.channel.forEach(channel => {
      query.append('channel', channel);
    });
  }
  if (params.customer) query.set('customer', params.customer.toString());
  if (params.user) query.set('user', params.user.toString());
  if (params.orderBy) query.set('orderBy', params.orderBy);
  if (params.orderDirection) query.set('orderDirection', params.orderDirection);
  
  return apiFetch<GetNotificationHistoryResponse>(`${config.site.apiUrl}/notifications/all?${query.toString()}`, {
    method: 'GET',
  });
}