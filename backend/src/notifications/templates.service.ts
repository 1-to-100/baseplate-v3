import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { NotificationsService } from '@/notifications/notifications.service';
import { ListTemplatesInputDto } from '@/notifications/dto/list-templates-input.dto';
import { NotificationTemplateDto } from '@/notifications/dto/notification-template.dto';
import { CreateTemplateDto } from '@/notifications/dto/create-template.dto';
import { UpdateTemplateDto } from '@/notifications/dto/update-template.dto';
import { SendTemplatesInputDto } from '@/notifications/dto/send-templates-input.dto';
import { sanitizeEditorHTML } from '@/common/helpers/sanitize.helper';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private database: DatabaseService,
    private notificationService: NotificationsService,
  ) {}

  async findAll(
    query: ListTemplatesInputDto,
  ): Promise<PaginatedOutputDto<NotificationTemplateDto>> {
    try {
      const { page = 1, perPage = 10, customerId, type, channel } = query;
      const offset = (page - 1) * perPage;

      // Build the base query
      let supabaseQuery = this.database.notification_templates
        .select(
          `
          *,
          customers!customer_id(customer_id, name, owner_id)
        `,
        )
        .is('deleted_at', null);

      // Apply filters
      if (customerId) {
        supabaseQuery = supabaseQuery.eq('customer_id', customerId);
      }

      if (type && type.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('type', type);
      }

      if (channel && channel.length > 0) {
        supabaseQuery = supabaseQuery.in('channel', channel);
      }

      // Get total count for pagination
      const { count } = await this.database.notification_templates
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Apply pagination and ordering
      const { data: templates, error } = await supabaseQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1);

      if (error) {
        this.logger.error('Error fetching notification templates:', error);
        throw new Error(
          `Failed to fetch notification templates: ${error.message}`,
        );
      }

      const transformedTemplates =
        templates?.map((template) => this.transformTemplate(template)) || [];

      const totalPages = Math.ceil((count || 0) / perPage);

      return {
        data: transformedTemplates,
        meta: {
          total: count || 0,
          lastPage: totalPages,
          currentPage: page,
          perPage,
          prev: page > 1 ? page - 1 : null,
          next: page < totalPages ? page + 1 : null,
        },
      };
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<NotificationTemplateDto> {
    try {
      const { data: template, error } =
        await this.database.notification_templates
          .select(
            `
          *,
          customers!customer_id(customer_id, name, owner_id)
        `,
          )
          .eq('id', id)
          .is('deleted_at', null)
          .single();

      if (error) {
        this.logger.error(`Error fetching notification template ${id}:`, error);
        if (error.code === 'PGRST116') {
          throw new NotFoundException(
            `Notification template with ID ${id} not found`,
          );
        }
        throw new Error(
          `Failed to fetch notification template: ${error.message}`,
        );
      }

      if (!template) {
        throw new NotFoundException(
          `Notification template with ID ${id} not found`,
        );
      }

      return this.transformTemplate(template);
    } catch (error) {
      this.logger.error(`Error in findOne for template ${id}:`, error);
      throw error;
    }
  }

  async createTemplate(
    createTemplateDto: CreateTemplateDto,
    customerId?: string,
  ): Promise<NotificationTemplateDto> {
    try {
      // Sanitize template message to prevent XSS attacks
      const sanitizedMessage = sanitizeEditorHTML(createTemplateDto.message);

      const templateData = {
        title: createTemplateDto.title,
        message: sanitizedMessage,
        comment: createTemplateDto.comment,
        type: createTemplateDto.type,
        channel: createTemplateDto.channel,
        customer_id: customerId,
        created_at: new Date().toISOString(),
      };

      const { data: template, error } =
        await this.database.notification_templates
          .insert(templateData)
          .select(
            `
          *,
          customers!customer_id(customer_id, name, owner_id)
        `,
          )
          .single();

      if (error) {
        this.logger.error('Error creating notification template:', error);
        if (error.code === '23505') {
          throw new ConflictException(
            'A notification template with this title already exists',
          );
        }
        throw new Error(
          `Failed to create notification template: ${error.message}`,
        );
      }

      if (!template) {
        throw new Error(
          'Failed to create notification template: No data returned',
        );
      }

      this.logger.log(`Created notification template with ID: ${template.id}`);
      return this.transformTemplate(template);
    } catch (error) {
      this.logger.error('Error in createTemplate:', error);
      throw error;
    }
  }

  async updateTemplate(
    id: number,
    updateTemplateDto: UpdateTemplateDto,
    customerId?: string,
  ): Promise<NotificationTemplateDto> {
    try {
      // First check if the template exists and belongs to the customer (if specified)
      let existingQuery = this.database.notification_templates
        .select('id, customer_id')
        .eq('id', id)
        .is('deleted_at', null);

      if (customerId) {
        existingQuery = existingQuery.eq('customer_id', customerId);
      }

      const { data: existing, error: existingError } =
        await existingQuery.single();

      if (existingError || !existing) {
        throw new NotFoundException(
          `Notification template with ID ${id} not found`,
        );
      }

      // Prepare update data (only include fields that are provided)
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateTemplateDto.title !== undefined) {
        updateData.title = updateTemplateDto.title;
      }
      if (updateTemplateDto.message !== undefined) {
        // Sanitize message to prevent XSS attacks
        updateData.message = sanitizeEditorHTML(updateTemplateDto.message);
      }
      if (updateTemplateDto.comment !== undefined) {
        updateData.comment = updateTemplateDto.comment;
      }
      if (updateTemplateDto.type !== undefined) {
        updateData.type = updateTemplateDto.type;
      }
      if (updateTemplateDto.channel !== undefined) {
        updateData.channel = updateTemplateDto.channel;
      }

      const { data: template, error } =
        await this.database.notification_templates
          .update(updateData)
          .eq('id', id)
          .is('deleted_at', null)
          .select(
            `
          *,
          customers!customer_id(customer_id, name, owner_id)
        `,
          )
          .single();

      if (error) {
        this.logger.error(`Error updating notification template ${id}:`, error);
        if (error.code === '23505') {
          throw new ConflictException(
            'A notification template with this title already exists',
          );
        }
        throw new Error(
          `Failed to update notification template: ${error.message}`,
        );
      }

      if (!template) {
        throw new NotFoundException(
          `Notification template with ID ${id} not found`,
        );
      }

      this.logger.log(`Updated notification template with ID: ${id}`);
      return this.transformTemplate(template);
    } catch (error) {
      this.logger.error(`Error in updateTemplate for template ${id}:`, error);
      throw error;
    }
  }

  async update(
    id: number,
    updateTemplateDto: UpdateTemplateDto,
    customerId: string,
  ): Promise<NotificationTemplateDto> {
    return this.updateTemplate(id, updateTemplateDto, customerId);
  }

  async remove(
    id: number,
    customerId?: string,
  ): Promise<NotificationTemplateDto> {
    try {
      // First check if the template exists and belongs to the customer (if specified)
      let existingQuery = this.database.notification_templates
        .select(
          `
          *,
          customers!customer_id(customer_id, name, owner_id)
        `,
        )
        .eq('id', id)
        .is('deleted_at', null);

      if (customerId) {
        existingQuery = existingQuery.eq('customer_id', customerId);
      }

      const { data: existing, error: existingError } =
        await existingQuery.single();

      if (existingError || !existing) {
        throw new NotFoundException(
          `Notification template with ID ${id} not found`,
        );
      }

      // Perform soft delete by setting deleted_at timestamp
      const { data: template, error } =
        await this.database.notification_templates
          .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .is('deleted_at', null)
          .select(
            `
          *,
          customers!customer_id(customer_id, name, owner_id)
        `,
          )
          .single();

      if (error) {
        this.logger.error(`Error deleting notification template ${id}:`, error);
        throw new Error(
          `Failed to delete notification template: ${error.message}`,
        );
      }

      if (!template) {
        throw new NotFoundException(
          `Notification template with ID ${id} not found`,
        );
      }

      this.logger.log(`Soft deleted notification template with ID: ${id}`);
      return this.transformTemplate(template);
    } catch (error) {
      this.logger.error(`Error in remove for template ${id}:`, error);
      throw error;
    }
  }

  async sendTemplate(
    id: string,
    sendTemplatesInputDto: SendTemplatesInputDto,
    customerId: string,
  ): Promise<{ message: string }> {
    try {
      // First get the template
      const template = await this.findOne(id);

      // Verify the template belongs to the customer
      if (template.customerId && template.customerId !== customerId) {
        throw new NotFoundException(
          `Notification template with ID ${id} not found for this customer`,
        );
      }

      // Use the existing sendNotificationUsingTemplate method
      await this.sendNotificationUsingTemplate(
        id,
        sendTemplatesInputDto,
        customerId,
      );

      return {
        message: `Notification template "${template.title}" sent successfully`,
      };
    } catch (error) {
      this.logger.error(`Error in sendTemplate for template ${id}:`, error);
      throw error;
    }
  }

  async sendNotificationUsingTemplate(
    templateId: string,
    sendTemplateInputDto: SendTemplatesInputDto,
    customerId?: string,
  ): Promise<NotificationTemplateDto> {
    try {
      // Get the template
      const template = await this.findOne(templateId);

      // Verify the template belongs to the customer if customerId is provided
      if (
        customerId &&
        template.customerId &&
        template.customerId !== customerId
      ) {
        throw new NotFoundException(
          `Notification template with ID ${templateId} not found for this customer`,
        );
      }

      // Determine target users
      let targetUserIds: string[] = [];

      if (
        sendTemplateInputDto.userIds &&
        sendTemplateInputDto.userIds.length > 0
      ) {
        targetUserIds = sendTemplateInputDto.userIds;
      } else if (sendTemplateInputDto.customerId) {
        // If no specific users provided but customerId is given, get all users for that customer
        const { data: users, error } = await this.database.users
          .select('id')
          .eq('customer_id', sendTemplateInputDto.customerId)
          .is('deleted_at', null);

        if (error) {
          throw new Error(
            `Failed to fetch users for customer: ${error.message}`,
          );
        }

        targetUserIds = users?.map((user) => user.id) || [];
      }

      if (targetUserIds.length === 0) {
        throw new Error('No target users specified for notification');
      }

      // Send notifications to each user using the NotificationsService
      const notificationPromises: Promise<any>[] = [];

      for (const userId of targetUserIds) {
        notificationPromises.push(
          this.notificationService.create({
            userId,
            customerId:
              template.customerId || sendTemplateInputDto.customerId,
            type: template.type,
            title: template.title,
            message: template.message,
            templateId: template.id,
            channel: template.channel,
          }),
        );
      }

      await Promise.all(notificationPromises);

      this.logger.log(
        `Sent notifications using template ${templateId} to ${targetUserIds.length} users`,
      );
      return template;
    } catch (error) {
      this.logger.error(
        `Error in sendNotificationUsingTemplate for template ${templateId}:`,
        error,
      );
      throw error;
    }
  }

  private transformTemplate(template: any): NotificationTemplateDto {
    return {
      id: template.id,
      title: template.title,
      message: template.message,
      comment: template.comment,
      type: template.type,
      channel: template.channel,
      customerId: template.customer_id,
      Customer: template.customers
        ? {
            id: template.customers.customer_id,
            name: template.customers.name,
            ownerId: template.customers.owner_id,
          }
        : undefined,
      createdAt: new Date(template.created_at),
    };
  }
}
