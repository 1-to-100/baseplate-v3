import { ApiNotification, NotificationType } from "@/contexts/auth/types";
import { createClient } from "@/lib/supabase/client";
import { NotificationTypeList, NotificationTypes } from "@/lib/constants/notification-types";
import { NotificationChannelList } from "@/lib/constants/notification-channel";
import { sanitizeEditorHTML, sanitizeNotificationHTML } from "@/lib/sanitize";
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
  const currentUser = await supabaseDB.getCurrentUser();

  const { count, error } = await supabase
    .from('notifications')
    .select('notification_id', { count: 'exact', head: true })
    .eq('user_id', currentUser.user_id)
    .is('read_at', null); // NULL read_at means unread
  
  if (error) throw error;
  
  return { count: count || 0 };
}

export async function getNotifications(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  const page = params.page || 1;
  const perPage = params.perPage || 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  // Build the query - match backend findAll: select all fields with relationships and filter by user_id
  let query = supabase
    .from('notifications')
    .select(
      `*,
      users!user_id(user_id, email, full_name),
      customers!customer_id(customer_id, name)`,
      { count: 'exact' }
    )
    .eq('user_id', currentUser.user_id)
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
  
  // Apply sorting - default to created_at desc like backend, but allow custom ordering
  const validOrderColumns = ['notification_id', 'title', 'message', 'type', 'channel', 'read_at', 'created_at', 'updated_at'];
  const orderBy = (params.orderBy && validOrderColumns.includes(params.orderBy)) ? params.orderBy : 'created_at';
  const orderDirection = params.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  const total = count || 0;
  const lastPage = Math.ceil(total / perPage);
  
  // Transform data to match backend format and frontend ApiNotification interface
  interface NotificationWithRelations {
    notification_id: string;
    title: string | null;
    message: string;
    type: string[];
    channel: string | null;
    read_at: string | null;
    created_at: string;
    updated_at: string | null;
    user_id: string;
    customer_id: string | null;
    sender_id: string | null;
    template_id: string | null;
    generated_by: string | null;
    users: {
      user_id: string;
      email: string;
      full_name: string | null;
    } | {
      user_id: string;
      email: string;
      full_name: string | null;
    }[] | null;
    customers: {
      customer_id: string;
      name: string;
    } | {
      customer_id: string;
      name: string;
    }[] | null;
  }
  
  return {
    data: (data || []).map((notification: NotificationWithRelations) => {
      // Handle users relationship (can be object or array)
      let user = null;
      if (notification.users) {
        const users = Array.isArray(notification.users) ? notification.users[0] : notification.users;
        if (users) {
          // Parse full_name into firstName and lastName
          const nameParts = (users.full_name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          user = {
            id: users.user_id,
            email: users.email,
            firstName,
            lastName,
          };
        }
      }
      
      // Handle customers relationship (can be object or array)
      let customer = null;
      if (notification.customers) {
        const customers = Array.isArray(notification.customers) ? notification.customers[0] : notification.customers;
        if (customers) {
          customer = {
            id: customers.customer_id,
            name: customers.name,
          };
        }
      }
      
      // Transform type array to string (join with comma like getNotificationTemplates does)
      const typeString = Array.isArray(notification.type) ? notification.type.join(',') : notification.type;
      
      return {
        id: notification.notification_id,
        title: notification.title || '',
        message: notification.message,
        comment: '',
        type: typeString,
        channel: notification.channel || '',
        readAt: notification.read_at,
        createdAt: notification.created_at,
        User: user || undefined,
        Customer: customer || undefined,
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

export async function markNotificationAsRead(id: string): Promise<void> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() }) // Set read_at timestamp to mark as read
    .eq('notification_id', id)
    .eq('user_id', currentUser.user_id); // Filter by user_id for RLS compliance
  
  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() }) // Set read_at timestamp to mark as read
    .eq('user_id', currentUser.user_id) // Filter by user_id for RLS compliance
    .is('read_at', null); // Only update unread notifications (where read_at is NULL)
  
  if (error) throw error;
}

// ============================================================================
// Reusable Notification Creation (matches backend NotificationsService.create)
// ============================================================================

export interface CreateNotificationInput {
  userId?: string;
  customerId?: string;
  type: string[];
  title: string;
  message: string;
  channel: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
  senderId?: string;
  generatedBy?: string;
}

/**
 * Send in-app notification via Supabase realtime broadcast
 * Matches backend NotificationsService.sendInAppNotification
 */
async function sendInAppNotification(
  notification: CreateNotificationInput & { userId: string }
): Promise<void> {
  if (
    !notification.userId ||
    !notification.customerId ||
    !notification.type.includes(NotificationTypes.in_app)
  ) {
    return;
  }

  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  // If sending to current user, dispatch a custom event instead of broadcasting
  // This avoids interfering with the user's existing channel subscription
  if (notification.userId === currentUser.user_id) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase:notification', {
        detail: {
          type: 'broadcast',
          event: 'new',
          payload: {
            title: notification.title,
            message: notification.message,
            channel: notification.channel,
          },
        },
      }));
    }
    return;
  }
  
  try {
    const channelName = `main-notifications:${notification.userId}`;
    const channel = supabase.channel(channelName);
    
    // Subscribe and wait for ready
    const subscribePromise = new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Failed to subscribe to channel: ${status}`));
        }
      });
    });

    await subscribePromise;
    
    // Small delay to ensure channel is fully ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send the broadcast
    const sendResponse = await channel.send({
      type: 'broadcast',
      event: 'new',
      payload: {
        title: notification.title,
        message: notification.message,
        channel: notification.channel,
      },
    });

    if (sendResponse === 'error') {
      throw new Error('Failed to send broadcast');
    }

    // Only unsubscribe, don't remove channel to avoid interfering with user's subscription
    await channel.unsubscribe();
  } catch (error) {
    // Log error but don't fail - frontend may not have permission to broadcast
    console.error(`Failed to send in-app notification to user ${notification.userId}:`, error);
  }
}

/**
 * Send unread count notification via Supabase realtime broadcast
 * Matches backend NotificationsService.sendUnreadCountNotification
 */
async function sendUnreadCountNotification(userId: string): Promise<void> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();
  
  // Get unread count
  const { count, error: countError } = await supabase
    .from('notifications')
    .select('notification_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (countError) {
    throw countError;
  }

  const unreadCount = count || 0;

  // If sending to current user, dispatch a custom event instead of broadcasting
  // This avoids interfering with the user's existing channel subscription
  if (userId === currentUser.user_id) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase:notification', {
        detail: {
          type: 'broadcast',
          event: 'unread_count',
          payload: { count: unreadCount },
        },
      }));
    }
    return;
  }
  
  try {
    const channelName = `unread-notifications:${userId}`;
    const channel = supabase.channel(channelName);
    
    const subscribePromise = new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Failed to subscribe to channel: ${status}`));
        }
      });
    });

    await subscribePromise;
    
    // Small delay to ensure channel is fully ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const sendResponse = await channel.send({
      type: 'broadcast',
      event: 'unread_count',
      payload: { count: unreadCount },
    });

    if (sendResponse === 'error') {
      throw new Error('Failed to send broadcast');
    }

    // Only unsubscribe, don't remove channel to avoid interfering with user's subscription
    await channel.unsubscribe();
  } catch (error) {
    // Log error but don't fail - frontend may not have permission to broadcast
    console.error(`Failed to send unread count notification to user ${userId}:`, error);
  }
}

/**
 * Create notification(s) for users - matches backend NotificationsService.create logic
 * Handles both single user (userId) and multiple users (customerId) cases
 * This creates actual notifications, not notification templates
 */
export async function createUserNotification(
  input: CreateNotificationInput
): Promise<void> {
  const supabase = createClient();
  const currentUser = await supabaseDB.getCurrentUser();

  // Sanitize message content to prevent XSS attacks
  const sanitizedMessage = sanitizeNotificationHTML(input.message);

  const { userId, customerId } = input;

  if (!userId && customerId) {
    // Case 1: customerId provided (no userId) - create notifications for all users in customer
    const users = await supabase
      .from('users')
      .select('user_id')
      .eq('customer_id', customerId)
      .is('deleted_at', null);

    if (users.error) {
      throw new Error(`Failed to fetch users: ${users.error.message}`);
    }

    if (!users.data || users.data.length === 0) {
      throw new Error('No users found for the customer');
    }

    const notifications = users.data.map((user) => ({
      user_id: user.user_id,
      customer_id: customerId || null,
      sender_id: input.senderId || currentUser.user_id,
      type: input.type,
      title: input.title,
      message: sanitizedMessage,
      template_id: input.templateId || null,
      metadata: input.metadata || null,
      channel: input.channel,
      read_at: null, // null means unread; read_at is source of truth
      generated_by: input.generatedBy || null,
    }));

    // Create notifications using batch insert
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      throw new Error('Failed to create notifications');
    }

    // Use setTimeout to delay realtime notifications (matching backend behavior)
    setTimeout(() => {
      Promise.all(
        users.data.map((user) => sendUnreadCountNotification(user.user_id))
      )
        .then(() => {
          return Promise.all(
            notifications.map((notification) =>
              sendInAppNotification({
                ...input,
                userId: notification.user_id,
                customerId: notification.customer_id || customerId,
                message: sanitizedMessage,
              })
            )
          );
        })
        .catch((error) => {
          console.error('Error in delayed notification processing', error);
        });
    }, 100);
  } else if (userId) {
    // Case 2: userId provided - create single notification
    const notificationData = {
      user_id: userId,
      customer_id: customerId || null,
      sender_id: input.senderId || currentUser.user_id,
      type: input.type,
      title: input.title,
      message: sanitizedMessage,
      template_id: input.templateId || null,
      metadata: input.metadata || null,
      channel: input.channel,
      read_at: null, // null means unread; read_at is source of truth
      generated_by: input.generatedBy || null,
    };

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notificationData);

    if (insertError) {
      throw new Error('Failed to create notification');
    }

    // Send realtime notifications immediately
    await Promise.all([
      sendUnreadCountNotification(userId),
      sendInAppNotification({
        ...input,
        userId,
        customerId: customerId || currentUser.customer_id || undefined,
        message: sanitizedMessage,
      }),
    ]);
  } else {
    throw new Error('Notification must be associated with a user or customer');
  }
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
  
  interface TemplateWithCustomer {
    template_id: string;
    title: string;
    message: string;
    comment?: string | null;
    type: string[];
    channel: string;
    created_at: string;
    updated_at: string;
    customers: {
      customer_id: string;
      name: string;
      owner_id: string | null;
    } | {
      customer_id: string;
      name: string;
      owner_id: string | null;
    }[] | null;
  }
  
  return {
    data: (data || []).map((template: TemplateWithCustomer) => {
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
    readAt: notification.read_at,
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
  const updateData: {
    title: string;
    message: string;
    comment: string;
    type: string[];
    channel: string;
    updated_at: string;
  } = {
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
  
  // Determine target - use customerId if provided, otherwise send to individual users
  if (data.customerId) {
    // Case: Send to all users in customer (uses customerId path in createUserNotification)
    await createUserNotification({
      customerId: data.customerId,
      type: template.type,
      title: template.title,
      message: template.message,
      channel: template.channel,
      templateId: notificationTemplateId,
      senderId: currentUser.user_id,
      generatedBy: 'user (notifications api)',
    });
  } else if (data.userIds && data.userIds.length > 0) {
    // Case: Send to specific users - verify users first, then create notification for each
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
    
    // Create notification for each user (using userId path in createUserNotification)
    await Promise.all(
      users.map((user) =>
        createUserNotification({
          userId: user.user_id,
          customerId: template.customer_id || user.customer_id || undefined,
          type: template.type,
          title: template.title,
          message: template.message,
          channel: template.channel,
          templateId: notificationTemplateId,
          senderId: currentUser.user_id,
          generatedBy: 'user (notifications api)',
        })
      )
    );
  } else {
    throw new Error('No target users specified for notification');
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
  
  interface NotificationWithRelations {
    notification_id: number;
    title: string;
    message: string;
    type: string[];
    channel: string;
    created_at: string;
    read_at: string | null;
    users: {
      user_id: number;
      email: string;
      full_name: string;
    } | {
      user_id: number;
      email: string;
      full_name: string;
    }[] | null;
    customers: {
      customer_id: number;
      name: string;
    } | {
      customer_id: number;
      name: string;
    }[] | null;
  }
  
  return {
    data: (data || []).map((notification: NotificationWithRelations) => {
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