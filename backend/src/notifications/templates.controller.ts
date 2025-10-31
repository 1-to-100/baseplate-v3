import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User } from '@/common/decorators/user.decorator';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { CustomerId } from '@/common/decorators/customer-id.decorator';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { ApiPaginatedResponse } from '@/common/decorators/api-paginated-response.decorator';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { TemplatesService } from '@/notifications/templates.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { ListTemplatesInputDto } from '@/notifications/dto/list-templates-input.dto';
import { CreateTemplateDto } from '@/notifications/dto/create-template.dto';
import { UpdateTemplateDto } from '@/notifications/dto/update-template.dto';
import { SendTemplatesInputDto } from '@/notifications/dto/send-templates-input.dto';
import { NotificationTemplateDto } from '@/notifications/dto/notification-template.dto';
import { DatabaseService } from '@/common/database/database.service';
import { UserStatus } from '@/common/constants/status';
import {
  isSystemAdministrator,
  isCustomerSuccess,
} from '@/common/utils/user-role-helpers';

@ApiTags('Notification Templates')
@Controller('notification/templates')
@UseGuards(DynamicAuthGuard, ImpersonationGuard)
export class TemplatesController {
  constructor(
    private readonly database: DatabaseService,
    private readonly templatesService: TemplatesService,
  ) {}

  @Get()
  @ApiPaginatedResponse(NotificationTemplateDto)
  @ApiOkResponse({
    description: 'Get all notification templates.',
    type: PaginatedOutputDto,
    isArray: true,
  })
  async findAllTemplates(
    @User() user: OutputUserDto,
    @Query() query: ListTemplatesInputDto,
  ): Promise<PaginatedOutputDto<NotificationTemplateDto>> {
    if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
      throw new ForbiddenException(
        'User is not authorized to access notification templates',
      );
    }

    return this.templatesService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Get a notification template by ID.',
    type: NotificationTemplateDto,
  })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id') id: string,
    @User() user: OutputUserDto,
  ): Promise<NotificationTemplateDto> {
    if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
      throw new ForbiddenException(
        'User is not authorized to access notification templates',
      );
    }

    try {
      return await this.templatesService.findOne(id);
    } catch {
      throw new ForbiddenException(
        'Notification template not found or you do not have access to it',
      );
    }
  }

  @Post()
  @ApiOkResponse({
    description:
      'Create a notification template. Only system admin and customer success can create templates.',
  })
  async createTemplate(
    @User() user: OutputUserDto,
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<NotificationTemplateDto> {
    if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
      throw new ForbiddenException(
        'User is not authorized to create notification templates',
      );
    }

    return this.templatesService.createTemplate(createTemplateDto);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Update a notification template.',
  })
  @ApiParam({ name: 'id', type: Number })
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @User() user: OutputUserDto,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<NotificationTemplateDto> {
    if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
      throw new ForbiddenException(
        'User is not authorized to update notification templates',
      );
    }

    return this.templatesService.updateTemplate(id, updateTemplateDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'Delete a notification template.',
    type: NotificationTemplateDto,
  })
  @ApiParam({ name: 'id', type: Number })
  async deleteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @User() user: OutputUserDto,
  ) {
    if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
      throw new ForbiddenException(
        'User is not authorized to delete notification templates',
      );
    }

    return this.templatesService.remove(id);
  }

  @Post('/send/:templateId')
  @ApiOkResponse({
    description: 'Send a notification using a template.',
    type: NotificationTemplateDto,
  })
  @ApiParam({ name: 'templateId', type: Number })
  async sendNotificationUsingTemplate(
    @Param('templateId') templateId: string,
    @User() user: OutputUserDto,
    @Body() sendTemplateInputDto: SendTemplatesInputDto,
    @CustomerId() customerId: string | null,
  ): Promise<NotificationTemplateDto> {
    if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
      throw new ForbiddenException(
        'User is not authorized to send notifications using templates',
      );
    }

    if (!sendTemplateInputDto.userIds && !sendTemplateInputDto.customerId) {
      throw new ForbiddenException(
        'Notification must be associated with a users or a customer',
      );
    }

    if (isSystemAdministrator(user) && customerId) {
      sendTemplateInputDto.customerId = customerId;
    }

    if (isCustomerSuccess(user) && !user.customerId) {
      throw new ForbiddenException(
        'Customer success user must have a customerId to send notifications using templates',
      );
    } else if (
      customerId !== null &&
      isCustomerSuccess(user) &&
      user.customerId != customerId
    ) {
      throw new ForbiddenException(
        'Customer success user cannot send notifications for a different customer',
      );
    } else if (
      isCustomerSuccess(user) &&
      sendTemplateInputDto.customerId &&
      user.customerId != sendTemplateInputDto.customerId
    ) {
      throw new ForbiddenException(
        'Customer success user cannot send notifications for a different customer',
      );
    }

    if (
      !sendTemplateInputDto.customerId &&
      sendTemplateInputDto.userIds &&
      sendTemplateInputDto.userIds.length > 0
    ) {
      const foundUsers = await this.database.findMany('users', {
        where: {
          deleted_at: null,
          user_id: { in: sendTemplateInputDto.userIds },
        },
      });

      if (foundUsers && foundUsers.length === 0) {
        throw new ForbiddenException(
          'No users found for the provided user IDs',
        );
      }

      if (
        foundUsers.some(
          (foundUser) => String(foundUser.status) !== UserStatus.ACTIVE,
        )
      ) {
        throw new ForbiddenException('One or more users are not active');
      }

      for (const foundUser of foundUsers) {
        if (
          isCustomerSuccess(user) &&
          foundUser.customer_id !== user.customerId
        ) {
          throw new ForbiddenException(
            'Customer success user cannot send notifications for users belonging to a different customer',
          );
        }
      }
    }

    try {
      const template =
        await this.templatesService.sendNotificationUsingTemplate(
          templateId,
          sendTemplateInputDto,
        );

      return template;
    } catch (error: unknown) {
      throw new ForbiddenException(
        `Failed to send notification using template: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
