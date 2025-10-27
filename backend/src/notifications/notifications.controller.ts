import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { User } from '@/common/decorators/user.decorator';
import { DatabaseService } from '@/common/database/database.service';
import { ApiPaginatedResponse } from '@/common/decorators/api-paginated-response.decorator';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { NotificationsService } from '@/notifications/notifications.service';
import { NotificationDto } from '@/notifications/dto/notification.dto';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { CreateNotificationDto } from '@/notifications/dto/create-notification.dto';
import { ListNotificationsInputDto } from '@/notifications/dto/list-notifications-input.dto';
import { ListAdminNotificationsInputDto } from '@/notifications/dto/list-admin-notifications-input.dto';
import { CustomerId } from '@/common/decorators/customer-id.decorator';
import {
  isSystemAdministrator,
  isCustomerSuccess,
} from '@/common/utils/user-role-helpers';
import { UserStatus } from '@/common/types/database.types';

@Controller('notifications')
@UseGuards(DynamicAuthGuard, ImpersonationGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Only superadmins can create notifications
  @Post()
  @ApiOkResponse({
    description:
      'Notification created successfully. Only system admin can create notifications.',
    type: NotificationDto,
  })
  async createNotification(
    @User() user: OutputUserDto,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    if (!isSystemAdministrator(user)) {
      throw new ForbiddenException(
        'User is not authorized to create notifications',
      );
    }

    const { userId, customerId } = createNotificationDto;

    if (!userId && !customerId) {
      throw new BadRequestException(
        'Notification must be associated with a user or customer',
      );
    }

    if (customerId) {
      const foundCustomer = await this.database.findUnique('customers', {
        where: { id: customerId },
      });

      if (!foundCustomer) {
        throw new BadRequestException('Customer not found');
      }
    }

    if (userId) {
      const foundUser = await this.database.findUnique('users', {
        where: { id: userId },
      });

      if (!foundUser || foundUser.customer_id !== customerId) {
        throw new BadRequestException('User not linked to the customer');
      } else if (foundUser.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('User is not active');
      }
    }

    try {
      return this.notificationsService.create({
        ...createNotificationDto,
        senderId: user.id,
        generatedBy: 'user (notifications api)',
      });
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw new BadRequestException('Failed to create notification');
    }
  }

  @Get()
  @ApiPaginatedResponse(NotificationDto)
  @ApiOkResponse({
    description: 'The notifications list for the user',
    type: PaginatedOutputDto,
    isArray: true,
  })
  async findAllNotifications(
    @User() user: OutputUserDto,
    @Query() listNotificationsInputDto: ListNotificationsInputDto,
  ) {
    return this.notificationsService.findAll(
      user.id,
      listNotificationsInputDto,
    );
  }

  @Get('/all')
  @ApiPaginatedResponse(NotificationDto)
  @ApiOkResponse({
    description:
      'The notifications list, including all notifications. Only accessible by System Admin and Customer Success',
    type: PaginatedOutputDto,
    isArray: true,
  })
  async findAllNotificationsForAdmin(
    @User() user: OutputUserDto,
    @Query() adminNotificationsInputDto: ListAdminNotificationsInputDto,
    @CustomerId() customerId: string,
  ) {
    if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
      throw new ForbiddenException(
        'User is not authorized to access all notifications',
      );
    } else if (isCustomerSuccess(user) && !user.customerId) {
      throw new ForbiddenException(
        'Customer Success is not authorized to access all notifications without a customer ID',
      );
    } else if (
      isCustomerSuccess(user) &&
      adminNotificationsInputDto.customerId &&
      adminNotificationsInputDto.customerId.length == 1 &&
      !adminNotificationsInputDto.customerId.includes(user.customerId!)
    ) {
      throw new ForbiddenException(
        'Customer Success is not authorized to access notifications for this customer',
      );
    } else if (
      isCustomerSuccess(user) &&
      adminNotificationsInputDto.customerId &&
      adminNotificationsInputDto.customerId.length > 1
    ) {
      throw new ForbiddenException(
        'Customer Success is not authorized to access notifications for multiple customers',
      );
    }

    if (
      isSystemAdministrator(user) &&
      customerId &&
      !adminNotificationsInputDto.customerId
    ) {
      adminNotificationsInputDto.customerId = [customerId];
    } else if (
      isCustomerSuccess(user) &&
      !adminNotificationsInputDto.customerId
    ) {
      adminNotificationsInputDto.customerId = [user.customerId!];
    }

    return this.notificationsService.findAllForAdmin(
      adminNotificationsInputDto,
    );
  }

  @Get('/unread-count')
  @ApiOkResponse({
    description: 'Count of unread notifications',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          example: 5,
        },
      },
    },
  })
  async unreadCount(@User() user: OutputUserDto) {
    const count = await this.notificationsService.unreadCount(user.id);
    return { count };
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'The notification record',
    type: NotificationDto,
  })
  @ApiParam({ name: 'id', type: String })
  async findOneNotification(
    @User() user: OutputUserDto,
    @Param('id') id: string,
  ) {
    return this.notificationsService.findOne(user.id, parseInt(id));
  }

  @Patch('/read-all')
  @ApiOkResponse({
    description: 'Mark all notifications as read',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'All notifications marked as read',
        },
      },
    },
  })
  async markAllAsRead(@User() user: OutputUserDto) {
    try {
      await this.notificationsService.markAllAsRead(user.id);
    } catch (error) {
      this.logger.error('Failed to mark notifications as read', error);
      throw new BadRequestException('Failed to mark all notifications as read');
    }
    return { message: 'All notifications marked as read' };
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Mark notification as read',
    type: NotificationDto,
  })
  @ApiParam({ name: 'id', type: String })
  async markAsRead(@User() user: OutputUserDto, @Param('id') id: string) {
    try {
      await this.notificationsService.markAsRead(user.id, id);
    } catch (error) {
      this.logger.error('Failed to mark notifications as read', error);
      throw new BadRequestException('Failed to mark notification as read');
    }
  }

  @Patch()
  @ApiBody({
    description: 'Array of notification IDs to mark as read',
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Multiple notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Notifications marked as read',
        },
      },
    },
  })
  async marksAsReadMultiple(
    @User() user: OutputUserDto,
    @Body('ids') ids: string[],
  ) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException(
        'Invalid input: ids must be a non-empty array',
      );
    }

    try {
      await this.notificationsService.marksAsReadMultiple(user.id, ids);
    } catch (error) {
      this.logger.error('Failed to mark notifications as read', error);
      throw new BadRequestException('Failed to mark notifications as read');
    }

    return { message: 'Notifications marked as read' };
  }
}
