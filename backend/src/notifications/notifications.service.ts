import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';

import { CreateNotificationDto } from '@/notifications/dto/create-notification.dto';
import { ListNotificationsInputDto } from '@/notifications/dto/list-notifications-input.dto';
import { NotificationDto } from '@/notifications/dto/notification.dto';
import { NotificationTypes } from '@/notifications/constants/notification-types';
import { ListAdminNotificationsInputDto } from '@/notifications/dto/list-admin-notifications-input.dto';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(
    private database: DatabaseService,
    private supabaseService: SupabaseService,
  ) {}

  async create(
    createNotification: CreateNotificationDto & {
      senderId?: string;
      generatedBy?: string;
    },
  ) {
    this.logger.log('Creating notification');

    const { userId, customerId } = createNotification;

    if (!userId && customerId) {
      const users = await this.database.findMany('users', {
        where: { customer_id: customerId, deleted_at: null },
      });

      if (!users.length) {
        throw new ConflictException('No users found for the customer');
      }

      const notifications = users.map((user) => ({
        user_id: user.user_id,
        customer_id: createNotification.customerId,
        sender_id: createNotification.senderId,
        type: createNotification.type,
        title: createNotification.title,
        message: createNotification.message,
        template_id: createNotification.templateId,
        metadata: createNotification.metadata,
        channel: createNotification.channel,
        read_at: null, // null means unread; read_at is source of truth
        generated_by: createNotification.generatedBy,
      }));

      // Create notifications using raw Supabase client for batch insert
      const { data: createdNotifications, error } = await this.database
        .getClient()
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {
        throw new ConflictException('Failed to create notifications');
      }

      setTimeout(() => {
        Promise.all(
          users.map((user) => this.sendUnreadCountNotification(user.user_id)),
        )
          .then(() => {
            return Promise.all(
              notifications.map((notification) =>
                this.sendInAppNotification({
                  userId: notification.user_id,
                  customerId: notification.customer_id,
                  type: notification.type,
                  title: notification.title,
                  message: notification.message,
                  channel: notification.channel,
                }),
              ),
            );
          })
          .catch((error) => {
            this.logger.error(
              'Error in delayed notification processing',
              error,
            );
          });
      }, 100);

      return createdNotifications?.at(-1);
    } else if (userId) {
      const notificationData = {
        user_id: createNotification.userId,
        customer_id: createNotification.customerId,
        sender_id: createNotification.senderId,
        type: createNotification.type,
        title: createNotification.title,
        message: createNotification.message,
        template_id: createNotification.templateId,
        metadata: createNotification.metadata,
        channel: createNotification.channel,
        read_at: null, // null means unread; read_at is source of truth
        generated_by: createNotification.generatedBy,
      };

      const notification = await this.database.create('notifications', {
        data: notificationData as any,
      });

      await Promise.all([
        this.sendUnreadCountNotification(userId),
        this.sendInAppNotification({ ...createNotification, userId }),
      ]);

      return notification;
    }

    throw new ConflictException(
      'Notification must be associated with a user or customer',
    );
  }

  async findOne(userId: number, id: number) {
    this.logger.log(`Finding notification with id ${id}`);
    const notification = await this.database.findFirst('notifications', {
      where: { id, user_id: userId },
      select: `
        *,
        users!user_id(id, email, first_name, last_name),
        customers!customer_id(id, name)
      `,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async findAll(
    userId: number,
    listNotificationsInputDto: ListNotificationsInputDto,
  ): Promise<PaginatedOutputDto<NotificationDto>> {
    this.logger.log('Finding all notifications');
    const { perPage, page, type, isRead, channel } = listNotificationsInputDto;

    const whereClause: any = {
      user_id: userId,
    };

    if (type) whereClause.type = type;
    // Use read_at as source of truth: null = unread, not null = read
    if (isRead !== undefined) {
      whereClause.read_at = isRead ? { not: null } : null;
    }
    if (channel) whereClause.channel = channel;

    const paginatedResult = await this.database.paginate(
      'notifications',
      { page: page || 1, per_page: perPage || 10 },
      {
        where: whereClause,
        select: `
          *,
          users!user_id(id, email, first_name, last_name),
          customers!customer_id(id, name)
        `,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      },
    );

    // Transform the data to match expected DTO format
    const transformedData = paginatedResult.data.map((notification) => ({
      ...notification,
      isRead: notification.read_at !== null, // Computed from read_at for frontend compatibility
      createdAt: new Date(notification.created_at),
      readAt: notification.read_at ? new Date(notification.read_at) : undefined,
      userId: notification.user_id || undefined,
      customerId: notification.customer_id || undefined,
      senderId: notification.sender_id || undefined,
      templateId: notification.template_id || undefined,
      generatedBy: notification.generated_by || undefined,
    }));

    // Transform meta to match expected format
    const meta = {
      total: paginatedResult.meta.total,
      lastPage: paginatedResult.meta.total_pages,
      currentPage: paginatedResult.meta.page,
      perPage: paginatedResult.meta.per_page,
      prev:
        paginatedResult.meta.page > 1 ? paginatedResult.meta.page - 1 : null,
      next:
        paginatedResult.meta.page < paginatedResult.meta.total_pages
          ? paginatedResult.meta.page + 1
          : null,
    };

    return { data: transformedData as any, meta };
  }

  async findAllForAdmin(
    inputDto: ListAdminNotificationsInputDto,
  ): Promise<PaginatedOutputDto<NotificationDto>> {
    this.logger.log('Finding all admins notifications');
    const {
      perPage,
      page,
      userId,
      customerId,
      type,
      isRead,
      channel,
      senderId,
      search,
    } = inputDto;

    const whereClause: any = {};

    if (userId) whereClause.user_id = { in: userId };
    if (customerId) whereClause.customer_id = { in: customerId };
    if (senderId) whereClause.sender_id = { in: senderId };
    if (type) whereClause.type = type;
    // Use read_at as source of truth: null = unread, not null = read
    if (isRead !== undefined) {
      whereClause.read_at = isRead ? { not: null } : null;
    }
    if (channel) whereClause.channel = { in: channel };

    if (search) {
      whereClause.OR = [
        { title: { ilike: `%${search}%` } },
        { message: { ilike: `%${search}%` } },
        { generated_by: { ilike: `%${search}%` } },
      ];
    }

    const paginatedResult = await this.database.paginate(
      'notifications',
      { page: page || 1, per_page: perPage || 10 },
      {
        where: whereClause,
        select: `
          *,
          sender:users!sender_id(id, email, first_name, last_name),
          users!user_id(id, email, first_name, last_name),
          customers!customer_id(id, name)
        `,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      },
    );

    // Transform the data to match expected DTO format
    const transformedData = paginatedResult.data.map((notification) => ({
      ...notification,
      isRead: notification.read_at !== null, // Computed from read_at for frontend compatibility
      createdAt: new Date(notification.created_at),
      readAt: notification.read_at ? new Date(notification.read_at) : undefined,
      userId: notification.user_id || undefined,
      customerId: notification.customer_id || undefined,
      senderId: notification.sender_id || undefined,
      templateId: notification.template_id || undefined,
      generatedBy: notification.generated_by || undefined,
    }));

    // Transform meta to match expected format
    const meta = {
      total: paginatedResult.meta.total,
      lastPage: paginatedResult.meta.total_pages,
      currentPage: paginatedResult.meta.page,
      perPage: paginatedResult.meta.per_page,
      prev:
        paginatedResult.meta.page > 1 ? paginatedResult.meta.page - 1 : null,
      next:
        paginatedResult.meta.page < paginatedResult.meta.total_pages
          ? paginatedResult.meta.page + 1
          : null,
    };

    return { data: transformedData as any, meta };
  }

  async markAsRead(userId: string, id: string) {
    this.logger.log(
      `Marking user (${userId}) notification with id ${id} as read`,
    );

    const notification = await this.database.update('notifications', {
      where: { notification_id: id, user_id: userId },
      data: { read_at: new Date().toISOString() }, // read_at is source of truth
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.sendUnreadCountNotification(userId);

    return notification;
  }

  async markAllAsRead(userId: string) {
    this.logger.log('Marking all notifications as read');
    await this.database.updateMany('notifications', {
      where: { read_at: null, user_id: userId }, // Only mark unread ones (where read_at is null)
      data: { read_at: new Date().toISOString() }, // read_at is source of truth
    });

    await this.sendUnreadCountNotification(userId);
  }

  async marksAsReadMultiple(userId: string, ids: string[]) {
    this.logger.log(`Marking notifications with ids ${ids.join(', ')} as read`);
    await this.database.updateMany('notifications', {
      where: { notification_id: { in: ids }, read_at: null, user_id: userId }, // Only mark unread ones
      data: { read_at: new Date().toISOString() }, // read_at is source of truth
    });
    await this.sendUnreadCountNotification(userId);
  }

  async unreadCount(userId: string): Promise<number> {
    this.logger.log(`Counting unread notifications for user ${userId}`);
    return this.database.count('notifications', {
      where: { read_at: null, user_id: userId }, // read_at is null = unread
    });
  }

  async sendInAppNotification(notification: CreateNotificationDto) {
    if (
      !notification.userId ||
      !notification.customerId ||
      notification.type !== NotificationTypes.IN_APP
    ) {
      return;
    }

    return this.supabaseService.sendNotification(
      `main-notifications:${notification.userId}`,
      'new',
      notification,
    );
  }

  async sendUnreadCountNotification(userId: string) {
    const count = await this.unreadCount(userId);
    await this.supabaseService.sendNotification(
      `unread-notifications:${userId}`,
      'unread_count',
      { count },
    );
  }
}
