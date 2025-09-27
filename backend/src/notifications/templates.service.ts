import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { NotificationsService } from '@/notifications/notifications.service';
import { ListTemplatesInputDto } from '@/notifications/dto/list-templates-input.dto';
import { NotificationTemplateDto } from '@/notifications/dto/notification-template.dto';
import { CreateTemplateDto } from '@/notifications/dto/create-template.dto';
import { UpdateTemplateDto } from '@/notifications/dto/update-template.dto';
import { SendTemplatesInputDto } from '@/notifications/dto/send-templates-input.dto';

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
    this.logger.warn(
      '⚠️ TemplatesService temporarily disabled during Supabase migration',
    );
    return {
      data: [],
      meta: {
        total: 0,
        lastPage: 1,
        currentPage: 1,
        perPage: 10,
        prev: null,
        next: null,
      },
    };
  }

  async findOne(id: number): Promise<NotificationTemplateDto> {
    this.logger.warn(
      '⚠️ TemplatesService temporarily disabled during Supabase migration',
    );
    throw new Error(
      'TemplatesService temporarily disabled during Supabase migration',
    );
  }

  async createTemplate(
    createTemplateDto: CreateTemplateDto,
    customerId?: number,
  ): Promise<NotificationTemplateDto> {
    this.logger.warn(
      '⚠️ TemplatesService temporarily disabled during Supabase migration',
    );
    throw new Error(
      'TemplatesService temporarily disabled during Supabase migration',
    );
  }

  async updateTemplate(
    id: number,
    updateTemplateDto: UpdateTemplateDto,
    customerId?: number,
  ): Promise<NotificationTemplateDto> {
    this.logger.warn(
      '⚠️ TemplatesService temporarily disabled during Supabase migration',
    );
    throw new Error(
      'TemplatesService temporarily disabled during Supabase migration',
    );
  }

  async update(
    id: number,
    updateTemplateDto: UpdateTemplateDto,
    customerId: number,
  ): Promise<NotificationTemplateDto> {
    return this.updateTemplate(id, updateTemplateDto, customerId);
  }

  async remove(
    id: number,
    customerId?: number,
  ): Promise<NotificationTemplateDto> {
    this.logger.warn(
      '⚠️ TemplatesService temporarily disabled during Supabase migration',
    );
    throw new Error(
      'TemplatesService temporarily disabled during Supabase migration',
    );
  }

  async sendTemplate(
    id: number,
    sendTemplatesInputDto: SendTemplatesInputDto,
    customerId: number,
  ): Promise<{ message: string }> {
    this.logger.warn(
      '⚠️ TemplatesService temporarily disabled during Supabase migration',
    );
    throw new Error(
      'TemplatesService temporarily disabled during Supabase migration',
    );
  }

  async sendNotificationUsingTemplate(
    templateId: number,
    sendTemplateInputDto: SendTemplatesInputDto,
    customerId?: number,
  ): Promise<NotificationTemplateDto> {
    this.logger.warn(
      '⚠️ TemplatesService temporarily disabled during Supabase migration',
    );
    throw new Error(
      'TemplatesService temporarily disabled during Supabase migration',
    );
  }

  private transformTemplate(template: any): NotificationTemplateDto {
    // Stub transformation
    return template;
  }
}
