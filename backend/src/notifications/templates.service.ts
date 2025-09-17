import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { createPaginator } from 'prisma-pagination';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { NotificationsService } from '@/notifications/notifications.service';
import { ListTemplatesInputDto } from '@/notifications/dto/list-templates-input.dto';
import { NotificationTemplateDto } from '@/notifications/dto/notification-template.dto';
import { CreateTemplateDto } from '@/notifications/dto/create-template.dto';
import { UpdateTemplateDto } from '@/notifications/dto/update-template.dto';
import { SendTemplatesInputDto } from '@/notifications/dto/send-templates-input.dto';
import { NotificationTypes } from '@/notifications/constants/notification-types';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationsService,
  ) {}

  async findAll(
    query: ListTemplatesInputDto,
  ): Promise<PaginatedOutputDto<NotificationTemplateDto>> {
    this.logger.log('Fetching notification templates');
    const { perPage, page, customerId, search, type, channel } = query;
    const paginate = createPaginator({ perPage });

    const where: Prisma.NotificationTemplateWhereInput = {
      deletedAt: null,
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(type && type.length > 0
        ? {
            type: { hasSome: type },
          }
        : {}),
      ...(channel && channel.length > 0
        ? {
            channel: { in: channel },
          }
        : {}),
    };

    const paginateResult = await paginate<
      NotificationTemplateDto,
      Prisma.NotificationTemplateFindManyArgs
    >(
      this.prisma.notificationTemplate,
      {
        where,
        include: {
          Customer: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      { page },
    );

    const data = paginateResult.data.map((template) => ({
      id: template.id,
      title: template.title,
      message: template.message || '',
      type: template.type,
      comment: template.comment || undefined,
      channel: template.channel,
      customerId: template.customerId || undefined,
      Customer: template.Customer,
      createdAt: template.createdAt,
    })) as NotificationTemplateDto[];

    return { data, meta: paginateResult.meta };
  }

  async findOne(
    id: number,
    customerId?: number,
  ): Promise<NotificationTemplateDto> {
    this.logger.log(`Fetching notification template with ID ${id}`);

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id, customerId, deletedAt: null },
      include: {
        Customer: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!template) {
      throw new Error(`Notification template with ID ${id} not found`);
    }

    return this.formatOutput(template);
  }

  async createTemplate(
    createTemplateDto: CreateTemplateDto,
    customerId?: number,
  ): Promise<NotificationTemplateDto> {
    this.logger.log('Creating notification template');

    const template = await this.prisma.notificationTemplate.create({
      data: {
        ...createTemplateDto,
        customerId,
      },
      include: {
        Customer: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    return this.formatOutput(template);
  }

  async updateTemplate(
    id: number,
    updateTemplateDto: UpdateTemplateDto,
  ): Promise<NotificationTemplateDto> {
    this.logger.log(`Updating notification template with ID ${id}`);

    const updatedTemplate = await this.prisma.notificationTemplate.update({
      where: { id, deletedAt: null },
      data: { ...updateTemplateDto },
      include: {
        Customer: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    return this.formatOutput(updatedTemplate);
  }

  async remove(id: number): Promise<NotificationTemplateDto> {
    this.logger.log(`Deleting notification template with ID ${id}`);

    const deletedTemplate = await this.prisma.notificationTemplate.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
      include: {
        Customer: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    return this.formatOutput(deletedTemplate);
  }

  async sendNotificationUsingTemplate(
    templateId: number,
    sendTemplateInputDto: SendTemplatesInputDto,
  ): Promise<NotificationTemplateDto> {
    this.logger.log(
      `Sending notification using template ID ${templateId} to user ID`,
    );

    const { customerId, userIds } = sendTemplateInputDto;

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id: templateId, deletedAt: null },
      include: {
        Customer: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!template) {
      throw new Error(`Notification template with ID ${templateId} not found`);
    } else if (
      template &&
      template.type.length > 0 &&
      template.type.includes('EMAIL')
    ) {
      const errorMessage = `Template with ID ${templateId} is of type EMAIL, which is not supported for sending notifications.`;
      this.logger.warn(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      if (customerId) {
        await this.notificationService.create({
          customerId: customerId,
          title: template.title,
          message: template.message || '',
          type: NotificationTypes.IN_APP,
          channel: template.channel,
        });
      } else {
        const sendPromises = (userIds || []).map((userId: number) =>
          this.notificationService.create({
            userId,
            customerId: customerId || undefined,
            title: template.title,
            message: template.message || '',
            type: NotificationTypes.IN_APP,
            channel: template.channel,
          }),
        );
        await Promise.all(sendPromises);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification using template ID ${templateId}`,
        error,
      );
      throw new Error(`Failed to send notification`);
    }

    return this.formatOutput(template);
  }

  private formatOutput(
    prismaItemTemplate: Prisma.NotificationTemplateGetPayload<{
      select: {
        id: true;
        title: true;
        message: true;
        type: true;
        comment: true;
        channel: true;
        customerId: true;
        Customer: {
          select: {
            id: true;
            name: true;
            ownerId: true;
          };
        };
        createdAt: true;
      };
    }>,
  ): NotificationTemplateDto {
    return {
      id: prismaItemTemplate.id,
      title: prismaItemTemplate.title,
      message: prismaItemTemplate.message || '',
      type: prismaItemTemplate.type,
      comment: prismaItemTemplate.comment || undefined,
      channel: prismaItemTemplate.channel,
      customerId: prismaItemTemplate.customerId || undefined,
      Customer: prismaItemTemplate.Customer,
      createdAt: prismaItemTemplate.createdAt,
    } as NotificationTemplateDto;
  }
}
