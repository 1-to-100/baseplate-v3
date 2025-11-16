import { ApiNotification, NotificationType } from "@/contexts/auth/types";
import { createClient } from "@/lib/supabase/client";
import { NotificationTypeList } from "@/lib/constants/notification-types";
import { NotificationChannelList } from "@/lib/constants/notification-channel";
import { sanitizeEditorHTML } from "@/lib/sanitize";
import { supabaseDB } from "@/lib/supabase/database";

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
    users?: {
      user_id: number;
      full_name: string;
      email: string;
    };
    customers?: { 
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
    .is('read_at', null); // NULL read_at means unread
  
  if (error) throw error;
  
  return { count: count || 0 };
}

export async function getNotifications(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
  const supabase = createClient();
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Build the query - notifications table uses read_at (timestamp) not is_read (boolean)
  let query = supabase
    .from('notifications')
    .select('notification_id, title, message, type, channel, read_at, created_at, updated_at', { count: 'exact' })
    .range(from, to);
  
  // Apply filters
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,message.ilike.%${params.search}%`);
  }
  
  // Use read_at: NULL = unread, NOT NULL = read
  if (params.isRead !== undefined) {
    if (params.isRead) {
      query = query.not('read_at', 'is', null);
    } else {
      query = query.is('read_at', null);
    }
  }
  
  // Type is an array column, use contains to check if array contains the value
  if (params.type) {
    query = query.contains('type', [params.type]);
  }
  
  if (params.channel) {
    query = query.eq('channel', params.channel);
  }
  
  // Apply sorting - only allow valid columns from notifications table
  const validOrderColumns = ['notification_id', 'title', 'message', 'type', 'channel', 'read_at', 'created_at', 'updated_at'];
  const orderBy = (params.orderBy && validOrderColumns.includes(params.orderBy)) ? params.orderBy : 'created_at';
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
      comment: '',
      type: notification.type,
      channel: notification.channel,
      isRead: notification.read_at !== null, // Convert read_at timestamp to boolean
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
    .update({ read_at: new Date().toISOString() }) // Set read_at timestamp to mark as read
    .eq('notification_id', id);
  
  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() }) // Set read_at timestamp to mark as read
    .is('read_at', null); // Only update unread notifications (where read_at is NULL)
  
  if (error) throw error;
}

export async function getNotificationTemplates(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
  const supabase = createClient();
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Build the query for notification_templates table
  let query = supabase
    .from('notification_templates')
    .select(`
      template_id,
      title,
      message,
      type,
      channel,
      created_at,
      updated_at,
      customers!notification_templates_customer_id_fkey(customer_id, name, owner_id)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .range(from, to);
  
  // Apply filters
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,message.ilike.%${params.search}%`);
  }
  
  if (params.type) {
    query = query.contains('type', [params.type]);
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
    data: (data || []).map((template: any) => {
      // Handle customers relationship (can be object or array)
      const customer = Array.isArray(template.customers) 
        ? template.customers[0] 
        : template.customers;
      
      return {
        id: template.template_id,
        title: template.title,
        message: template.message,
        comment: template.comment || '',
        type: Array.isArray(template.type) ? template.type.join(',') : template.type,
        channel: template.channel,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
        Customer: customer
          ? {
              id: customer.customer_id,
              name: customer.name,
            }
          : undefined,
      };
    }) as ApiNotification[],
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

export async function createNotification(data: CreateNotificationRequest): Promise<void> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  // Sanitize message content to prevent XSS attacks
  const sanitizedMessage = sanitizeEditorHTML(data.message);
  
  const { error } = await supabase
    .from('notification_templates')
    .insert({
      title: data.title,
      message: sanitizedMessage,
      comment: data.comment,
      type: data.type,
      channel: data.channel,
      customer_id: currentUser.customer_id || null,
      created_at: new Date().toISOString(),
    });
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('A notification template with this title already exists');
    }
    throw new Error(`Failed to create notification template: ${error.message}`);
  }
}

export async function getNotificationById(id: string): Promise<ApiNotification> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  // First try to get from notification_templates (for editing templates)
  const { data: template, error: templateError } = await supabase
    .from('notification_templates')
    .select(`
      template_id,
      title,
      message,
      comment,
      type,
      channel,
      created_at,
      updated_at
    `)
    .eq('template_id', id)
    .is('deleted_at', null)
    .single();
  
  if (!templateError && template) {
    return {
      id: template.template_id,
      title: template.title,
      message: template.message,
      comment: template.comment || '',
      type: Array.isArray(template.type) ? template.type.join(',') : template.type,
      channel: template.channel,
      createdAt: template.created_at,
    };
  }
  
  // If not found in templates, try notifications table
  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .select(`
      notification_id,
      title,
      message,
      type,
      channel,
      read_at,
      created_at,
      updated_at
    `)
    .eq('notification_id', id)
    .eq('user_id', currentUser.user_id)
    .single();
  
  if (notificationError || !notification) {
    throw new Error('Notification not found');
  }
  
  return {
    id: String(notification.notification_id),
    title: notification.title || '',
    message: notification.message,
    comment: '',
    type: Array.isArray(notification.type) ? notification.type.join(',') : notification.type,
    channel: notification.channel,
    isRead: notification.read_at !== null,
    createdAt: notification.created_at,
  };
}

export async function deleteNotification(id: string): Promise<void> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  // Check if template exists and belongs to user's customer
  const { data: existing, error: checkError } = await supabase
    .from('notification_templates')
    .select('template_id, customer_id')
    .eq('template_id', id)
    .is('deleted_at', null)
    .single();
  
  if (checkError || !existing) {
    throw new Error(`Notification template with ID ${id} not found`);
  }
  
  // Verify customer access if template has customer_id
  if (existing.customer_id && currentUser.customer_id !== existing.customer_id) {
    throw new Error('You do not have permission to delete this template');
  }
  
  // Perform soft delete
  const { error } = await supabase
    .from('notification_templates')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('template_id', id)
    .is('deleted_at', null);
  
  if (error) {
    throw new Error(`Failed to delete notification template: ${error.message}`);
  }
}

export async function editNotification(id: string, data: CreateNotificationRequest): Promise<void> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  // Check if template exists and belongs to user's customer
  const { data: existing, error: checkError } = await supabase
    .from('notification_templates')
    .select('template_id, customer_id')
    .eq('template_id', id)
    .is('deleted_at', null)
    .single();
  
  if (checkError || !existing) {
    throw new Error(`Notification template with ID ${id} not found`);
  }
  
  // Verify customer access if template has customer_id
  if (existing.customer_id && currentUser.customer_id !== existing.customer_id) {
    throw new Error('You do not have permission to edit this template');
  }
  
  // Sanitize message content to prevent XSS attacks
  const sanitizedMessage = sanitizeEditorHTML(data.message);
  
  // Prepare update data
  const updateData: any = {
    title: data.title,
    message: sanitizedMessage,
    comment: data.comment,
    type: data.type,
    channel: data.channel,
    updated_at: new Date().toISOString(),
  };
  
  const { error } = await supabase
    .from('notification_templates')
    .update(updateData)
    .eq('template_id', id)
    .is('deleted_at', null);
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('A notification template with this title already exists');
    }
    throw new Error(`Failed to update notification template: ${error.message}`);
  }
}

export async function sendNotification(data: SendNotificationRequest, notificationTemplateId: string): Promise<void> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  // Get the template
  const { data: template, error: templateError } = await supabase
    .from('notification_templates')
    .select('template_id, title, message, type, channel, customer_id')
    .eq('template_id', notificationTemplateId)
    .is('deleted_at', null)
    .single();
  
  if (templateError || !template) {
    throw new Error(`Notification template with ID ${notificationTemplateId} not found`);
  }
  
  // Verify customer access if template has customer_id
  if (template.customer_id && currentUser.customer_id !== template.customer_id) {
    throw new Error('You do not have permission to send notifications using this template');
  }
  
  // Determine target users
  let targetUserIds: string[] = [];
  
  if (data.userIds && data.userIds.length > 0) {
    // Verify users exist and are active
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, customer_id, status')
      .in('user_id', data.userIds)
      .is('deleted_at', null);
    
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }
    
    if (!users || users.length === 0) {
      throw new Error('No users found for the provided user IDs');
    }
    
    // Check if all users are active
    const inactiveUsers = users.filter(user => user.status !== 'active');
    if (inactiveUsers.length > 0) {
      throw new Error('One or more users are not active');
    }
    
    // Verify customer access for customer success users
    if (currentUser.customer_id) {
      const invalidUsers = users.filter(user => user.customer_id !== currentUser.customer_id);
      if (invalidUsers.length > 0) {
        throw new Error('Cannot send notifications to users belonging to a different customer');
      }
    }
    
    targetUserIds = users.map(user => user.user_id);
  } else if (data.customerId) {
    // Get all users for the customer
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id')
      .eq('customer_id', data.customerId)
      .is('deleted_at', null);
    
    if (usersError) {
      throw new Error(`Failed to fetch users for customer: ${usersError.message}`);
    }
    
    targetUserIds = users?.map(user => user.user_id) || [];
  }
  
  if (targetUserIds.length === 0) {
    throw new Error('No target users specified for notification');
  }
  
  // Sanitize message content to prevent XSS attacks
  const sanitizedMessage = sanitizeEditorHTML(template.message);
  
  // Create notifications for each user
  const notifications = targetUserIds.map((userId) => ({
    user_id: userId,
    customer_id: template.customer_id || data.customerId || null,
    sender_id: currentUser.user_id,
    type: template.type,
    title: template.title,
    message: sanitizedMessage,
    template_id: notificationTemplateId,
    channel: template.channel,
    read_at: null,
    generated_by: 'user (notifications api)',
  }));
  
  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);
  
  if (insertError) {
    throw new Error(`Failed to create notifications: ${insertError.message}`);
  }
}

export async function getNotificationsTypes(): Promise<NotificationType> {
  // Return constants directly - no API calls or database queries needed
  return {
    types: NotificationTypeList,
    channels: NotificationChannelList,
  };
}

export async function getNotificationsHistory(params: GetNotificationHistoryParams = {}): Promise<GetNotificationHistoryResponse> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Build the query with joins
  let query = supabase
    .from('notifications')
    .select(`
      notification_id,
      title,
      message,
      type,
      channel,
      created_at,
      read_at,
      users!user_id(user_id, email, full_name),
      customers!customer_id(customer_id, name)
    `, { count: 'exact' })
    .range(from, to);
  
  // Apply filters
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,message.ilike.%${params.search}%,generated_by.ilike.%${params.search}%`);
  }
  
  if (params.type) {
    query = query.contains('type', [params.type]);
  }
  
  if (params.channel && params.channel.length > 0) {
    query = query.in('channel', params.channel);
  }
  
  if (params.customerId && params.customerId.length > 0) {
    query = query.in('customer_id', params.customerId);
  } else if (currentUser.customer_id) {
    // If customer success user, filter by their customer
    query = query.eq('customer_id', currentUser.customer_id);
  }
  
  if (params.userId && params.userId.length > 0) {
    query = query.in('user_id', params.userId);
  }
  
  if (params.senderId && params.senderId.length > 0) {
    query = query.in('sender_id', params.senderId);
  }
  
  // Apply sorting
  const orderBy = params.orderBy || 'created_at';
  const orderDirection = params.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });
  
  const { data, error, count } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch notification history: ${error.message}`);
  }
  
  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);
  
  return {
    data: (data || []).map((notification: any) => {
      const result: {
        id: number;
        title: string;
        message: string;
        type: string;
        channel: string;
        createdAt: string;
        users?: {
          user_id: number;
          full_name: string;
          email: string;
        };
        customers?: {
          customer_id: number;
          name: string;
        };
      } = {
        id: notification.notification_id,
        title: notification.title,
        message: notification.message,
        type: Array.isArray(notification.type) ? notification.type.join(',') : notification.type,
        channel: notification.channel,
        createdAt: notification.created_at,
      };
      
      // Handle users relationship (can be object or array)
      if (notification.users) {
        const users = Array.isArray(notification.users) ? notification.users[0] : notification.users;
        if (users) {
          result.users = {
            user_id: users.user_id,
            full_name: users.full_name,
            email: users.email,
          };
        }
      }
      
      // Handle customers relationship (can be object or array)
      if (notification.customers) {
        const customers = Array.isArray(notification.customers) ? notification.customers[0] : notification.customers;
        if (customers) {
          result.customers = {
            customer_id: customers.customer_id,
            name: customers.name,
          };
        }
      }
      
      return result;
    }),
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