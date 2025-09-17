import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { createPaginator } from 'prisma-pagination';
import { Prisma } from '@prisma/client';

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
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async create(
    createNotification: CreateNotificationDto & {
      senderId?: number;
      generatedBy?: string;
    },
  ) {
    this.logger.log('Creating notification');

    const { userId, customerId } = createNotification;

    if (!userId && customerId) {
      const users = await this.prisma.user.findMany({
        where: { customerId, deletedAt: null },
      });

      if (!users.length) {
        throw new ConflictException('No users found for the customer');
      }

      const notifications = users.map((user) => ({
        ...createNotification,
        userId: user.id,
      }));

      await this.prisma.notification.createMany({ data: notifications });

      setTimeout(() => {
        Promise.all(
          users.map((user) => this.sendUnreadCountNotification(user.id)),
        )
          .then(() => {
            return Promise.all(
              notifications.map((notification) =>
                this.sendInAppNotification(notification),
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

      return notifications.at(-1);
    } else if (userId) {
      const notification = await this.prisma.notification.create({
        data: createNotification,
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
    const notification = await this.prisma.notification.findUnique({
      where: { id, userId },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        Customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
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
    const { perPage, page } = listNotificationsInputDto;
    const paginate = createPaginator({ perPage });

    const { type, isRead, channel } = listNotificationsInputDto;

    const where: Prisma.NotificationFindManyArgs['where'] = {
      userId,
      ...(type ? { type } : {}),
      ...(isRead !== undefined ? { isRead } : {}),
      ...(channel ? { channel } : {}),
    };

    const paginatedResult = await paginate<
      NotificationDto,
      Prisma.NotificationFindManyArgs
    >(
      this.prisma.notification,
      {
        where,
        include: {
          User: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          Customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      { page },
    );

    return paginatedResult;
  }

  async findAllForAdmin(
    inputDto: ListAdminNotificationsInputDto,
  ): Promise<PaginatedOutputDto<NotificationDto>> {
    this.logger.log('Finding all admins notifications');
    const { perPage, page } = inputDto;
    const paginate = createPaginator({ perPage });

    const { userId, customerId, type, isRead, channel, senderId, search } =
      inputDto;

    const where: Prisma.NotificationFindManyArgs['where'] = {
      ...(userId ? { userId: { in: userId } } : {}),
      ...(customerId ? { customerId: { in: customerId } } : {}),
      ...(type ? { type } : {}),
      ...(isRead !== undefined ? { isRead } : {}),
      ...(channel ? { channel: { in: channel } } : {}),
      ...(senderId ? { senderId: { in: senderId } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
              { generatedBy: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const paginatedResult = await paginate<
      NotificationDto,
      Prisma.NotificationFindManyArgs
    >(
      this.prisma.notification,
      {
        where,
        include: {
          Sender: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          User: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          Customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      { page },
    );

    return paginatedResult;
  }

  async markAsRead(userId: number, id: number) {
    this.logger.log(
      `Marking user (${userId}) notification with id ${id} as read`,
    );
    const notification = await this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.sendUnreadCountNotification(userId);

    return notification;
  }

  async markAllAsRead(userId: number) {
    this.logger.log('Marking all notifications as read');
    await this.prisma.notification.updateMany({
      where: { isRead: false, userId },
      data: { isRead: true, readAt: new Date() },
    });

    await this.sendUnreadCountNotification(userId);
  }

  async marksAsReadMultiple(userId: number, ids: number[]) {
    this.logger.log(`Marking notifications with ids ${ids.join(', ')} as read`);
    await this.prisma.notification.updateMany({
      where: { id: { in: ids }, isRead: false, userId },
      data: { isRead: true, readAt: new Date() },
    });
    await this.sendUnreadCountNotification(userId);
  }

  async unreadCount(userId: number): Promise<number> {
    this.logger.log(`Counting unread notifications for user ${userId}`);
    return this.prisma.notification.count({
      where: { isRead: false, userId },
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

  async sendUnreadCountNotification(userId: number) {
    const count = await this.unreadCount(userId);
    await this.supabaseService.sendNotification(
      `unread-notifications:${userId}`,
      'unread_count',
      { count },
    );
  }
}
