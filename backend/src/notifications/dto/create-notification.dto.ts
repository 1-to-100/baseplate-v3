import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import {
  NotificationType,
  NotificationTypeList,
  NotificationTypes,
} from '@/notifications/constants/notification-types';

export class CreateNotificationDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'User ID associated with the notification',
  })
  userId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Customer ID associated with the notification',
  })
  customerId?: string | null;

  @IsArray()
  @IsEnum(NotificationTypeList, { each: true })
  @ApiProperty({
    description: 'Types of the notification',
    enum: NotificationTypes,
    isArray: true,
    required: true,
    example: [NotificationTypes.email, NotificationTypes.in_app],
  })
  type: NotificationType[];

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Title of the notification', required: false })
  title?: string;

  @IsString()
  @ApiProperty({ description: 'Message content of the notification' })
  message: string;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Template ID associated with the notification',
  })
  templateId?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Metadata in JSON format',
    required: false,
  })
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Notification channel',
    required: false,
  })
  channel?: string;
}
