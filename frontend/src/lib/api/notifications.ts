import { ApiNotification, NotificationType } from "@/contexts/auth/types";
import { createClient } from "@/lib/supabase/client";

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
  customerId: string;
  userIds: string[];
}

export interface GetNotificationHistoryParams {
  page?: number;
  perPage?: number;
  search?: string;
  type?: string;
  channel?: string[];
  customerId?: string[];
  userId?: string[];
  senderId?: string[];
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
    users: {
      user_id: number;
      full_name: string;
      email: string;
    };
    customers: { 
      customer_id: number;
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
  const supabase = createClient();
  
  const { count, error } = await supabase
    .from('notifications')
    .select('notification_id', { count: 'exact', head: true })
    .eq('is_read', false);
  
  if (error) throw error;
  
  return { count: count || 0 };
}

export async function getNotifications(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
  const supabase = createClient();
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Build the query
  let query = supabase
    .from('notifications')
    .select('notification_id, title, message, comment, type, channel, is_read, created_at, updated_at', { count: 'exact' })
    .range(from, to);
  
  // Apply filters
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,message.ilike.%${params.search}%`);
  }
  
  if (params.isRead !== undefined) {
    query = query.eq('is_read', params.isRead);
  }
  
  if (params.type) {
    query = query.eq('type', params.type);
  }
  
  if (params.channel) {
    query = query.eq('channel', params.channel);
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
    data: (data || []).map(notification => ({
      id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      comment: notification.comment || '',
      type: notification.type,
      channel: notification.channel,
      isRead: notification.is_read,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at,
    })) as ApiNotification[],
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

export async function markNotificationAsRead(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('notification_id', id);
  
  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  
  if (error) throw error;
}

export async function getNotificationTemplates(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
  // API call removed
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

export async function createNotification(data: CreateNotificationRequest): Promise<void> {
  // API call removed
  throw new Error('API calls removed');
}

export async function getNotificationById(id: string): Promise<ApiNotification> {
  // API call removed
  throw new Error('API calls removed');
}

export async function deleteNotification(id: string): Promise<void> {
  // API call removed
  throw new Error('API calls removed');
}

export async function editNotification(id: string, data: CreateNotificationRequest): Promise<void> {
  // API call removed
  throw new Error('API calls removed');
}

export async function sendNotification(data: SendNotificationRequest, notificationTemplateId: string): Promise<void> {
  // API call removed
  throw new Error('API calls removed');
}

interface NotificationTypeData {
  notification_type_id: string;
  name: string;
  display_name: string | null;
  description: string | null;
}

export async function getNotificationsTypes(): Promise<NotificationType> {
  const supabase = createClient();
  
  // Get notification types
  const { data: typesData, error: typesError } = await supabase
    .from('notification_types')
    .select('notification_type_id, name, display_name, description')
    .order('name');
  
  if (typesError) throw typesError;
  
  // Get distinct channels from notifications table
  const { data: channelsData, error: channelsError } = await supabase
    .from('notifications')
    .select('channel')
    .not('channel', 'is', null);
  
  if (channelsError) throw channelsError;
  
  // Extract unique channel values
  const uniqueChannels = Array.from(
    new Set(
      (channelsData || [])
        .map((item) => item.channel)
        .filter((channel): channel is string => channel !== null)
    )
  );
  
  // Extract type names
  const typeNames = (typesData || []).map((type: NotificationTypeData) => type.name);
  
  return {
    types: typeNames,
    channels: uniqueChannels,
  };
}

export async function getNotificationsHistory(params: GetNotificationHistoryParams = {}): Promise<GetNotificationHistoryResponse> {
  // API call removed
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