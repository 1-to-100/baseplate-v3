import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { NotificationTypes } from '@/notifications/constants/notification-types';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;
  let supabaseService: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
            },
            notification: {
              create: jest.fn(),
              createMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create notifications for all users of a customer if only customerId is provided', async () => {
      const createNotificationDto = {
        customerId: 1,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: NotificationTypes.IN_APP,
        channel: 'IN_APP',
      };
      const mockUsers = [
        { id: 1, customerId: 1 },
        { id: 2, customerId: 1 },
      ];

      (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prismaService.notification.createMany as jest.Mock).mockResolvedValue(
        undefined,
      );
      (service.sendUnreadCountNotification as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);
      (service.sendInAppNotification as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.create(createNotificationDto);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          customerId: createNotificationDto.customerId,
          deletedAt: null,
        },
      });
      expect(prismaService.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 1, customerId: 1 }),
          expect.objectContaining({ userId: 2, customerId: 1 }),
        ]),
      });
      expect(result).toBeDefined();
    });

    it('should create a single notification if userId is provided', async () => {
      const createNotificationDto = {
        userId: 1,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: NotificationTypes.IN_APP,
        channel: 'IN_APP',
      };

      (prismaService.notification.create as jest.Mock).mockResolvedValue(
        createNotificationDto,
      );
      (service.sendUnreadCountNotification as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);
      (service.sendInAppNotification as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.create(createNotificationDto);

      expect(prismaService.notification.create).toHaveBeenCalledWith({
        data: createNotificationDto,
      });
      expect(result).toEqual(createNotificationDto);
    });

    it('should throw ConflictException if no users found for customer', async () => {
      const createNotificationDto = {
        customerId: 1,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: NotificationTypes.IN_APP,
        channel: 'IN_APP',
      };

      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.create(createNotificationDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.findMany).toHaveBeenCalled();
    });

    it('should throw ConflictException if neither userId nor customerId is provided', async () => {
      const createNotificationDto = {
        title: 'Test Notification',
        message: 'This is a test notification',
        type: NotificationTypes.IN_APP,
        channel: 'IN_APP',
      };

      await expect(
        service.create(createNotificationDto as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a notification if found', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        title: 'Test Notification',
        message: 'Message',
        type: NotificationTypes.IN_APP,
        channel: 'IN_APP',
        isRead: false,
        createdAt: new Date(),
        User: {
          id: 1,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        Customer: null,
      };

      (prismaService.notification.findUnique as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      const result = await service.findOne(1, 1);

      expect(result).toEqual(mockNotification);
      expect(prismaService.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      (prismaService.notification.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
      expect(prismaService.notification.findUnique).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of notifications for a user', async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          title: 'Test Notification 1',
          message: 'Message 1',
          type: NotificationTypes.IN_APP,
          channel: 'IN_APP',
          isRead: false,
          createdAt: new Date(),
          User: null,
          Customer: null,
        },
      ];

      (prismaService.notification as any).findMany = jest
        .fn()
        .mockResolvedValue(mockNotifications);
      (prismaService.notification as any).count = jest
        .fn()
        .mockResolvedValue(1);

      const query = { page: 1, perPage: 10 };
      const result = await service.findAll(1, query);

      expect(result.data).toEqual(mockNotifications);
      expect(result.meta).toBeDefined();
      expect(prismaService.notification.findMany).toHaveBeenCalled();
    });
  });

  describe('findAllForAdmin', () => {
    it('should return a paginated list of notifications for admin', async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          title: 'Admin Notification 1',
          message: 'Message 1',
          type: NotificationTypes.IN_APP,
          channel: 'IN_APP',
          isRead: false,
          createdAt: new Date(),
          User: null,
          Customer: null,
          Sender: null,
        },
      ];

      (prismaService.notification as any).findMany = jest
        .fn()
        .mockResolvedValue(mockNotifications);
      (prismaService.notification as any).count = jest
        .fn()
        .mockResolvedValue(1);

      const query = { page: 1, perPage: 10 };
      const result = await service.findAllForAdmin(query);

      expect(result.data).toEqual(mockNotifications);
      expect(result.meta).toBeDefined();
      expect(prismaService.notification.findMany).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        isRead: false,
        readAt: null,
      };
      const updatedNotification = {
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      };

      (prismaService.notification.update as jest.Mock).mockResolvedValue(
        updatedNotification,
      );
      (service.sendUnreadCountNotification as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.markAsRead(1, 1);

      expect(result.isRead).toBe(true);
      expect(prismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(service.sendUnreadCountNotification).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if notification not found', async () => {
      (prismaService.notification.update as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsRead(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.notification.update).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications for a user as read', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (service.sendUnreadCountNotification as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);

      await service.markAllAsRead(1);

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { isRead: false, userId: 1 },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(service.sendUnreadCountNotification).toHaveBeenCalledWith(1);
    });
  });

  describe('marksAsReadMultiple', () => {
    it('should mark multiple notifications as read', async () => {
      const idsToMark = [1, 2];
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (service.sendUnreadCountNotification as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);

      await service.marksAsReadMultiple(1, idsToMark);

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: idsToMark }, isRead: false, userId: 1 },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(service.sendUnreadCountNotification).toHaveBeenCalledWith(1);
    });
  });

  describe('unreadCount', () => {
    it('should return the count of unread notifications for a user', async () => {
      (prismaService.notification.count as jest.Mock).mockResolvedValue(5);

      const count = await service.unreadCount(1);

      expect(count).toBe(5);
      expect(prismaService.notification.count).toHaveBeenCalledWith({
        where: { isRead: false, userId: 1 },
      });
    });
  });

  describe('sendInAppNotification', () => {
    it('should send an in-app notification if conditions are met', async () => {
      const notification = {
        userId: 1,
        customerId: 1,
        title: 'In-App',
        message: 'Test',
        type: NotificationTypes.IN_APP,
        channel: 'IN_APP',
      };

      await service.sendInAppNotification(notification);

      expect(supabaseService.sendNotification).toHaveBeenCalledWith(
        `main-notifications:${notification.userId}`,
        'new',
        notification,
      );
    });

    it('should not send an in-app notification if userId is missing', async () => {
      const notification = {
        customerId: 1,
        title: 'In-App',
        message: 'Test',
        type: NotificationTypes.IN_APP,
        channel: 'IN_APP',
      };

      await service.sendInAppNotification(notification as any);

      expect(supabaseService.sendNotification).not.toHaveBeenCalled();
    });

    it('should not send an in-app notification if customerId is missing', async () => {
      const notification = {
        userId: 1,
        title: 'In-App',
        message: 'Test',
        type: NotificationTypes.IN_APP,
        channel: 'IN_APP',
      };

      await service.sendInAppNotification(notification as any);

      expect(supabaseService.sendNotification).not.toHaveBeenCalled();
    });

    it('should not send an in-app notification if type is not IN_APP', async () => {
      const notification = {
        userId: 1,
        customerId: 1,
        title: 'Email',
        message: 'Test',
        type: NotificationTypes.EMAIL,
        channel: 'EMAIL',
      };

      await service.sendInAppNotification(notification as any);

      expect(supabaseService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendUnreadCountNotification', () => {
    it('should send unread count notification', async () => {
      (service.unreadCount as jest.Mock) = jest.fn().mockResolvedValue(3);

      await service.sendUnreadCountNotification(1);

      expect(service.unreadCount).toHaveBeenCalledWith(1);
      expect(supabaseService.sendNotification).toHaveBeenCalledWith(
        `unread-notifications:1`,
        'unread_count',
        { count: 3 },
      );
    });
  });
});
