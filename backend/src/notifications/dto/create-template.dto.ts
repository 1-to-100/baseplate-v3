import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationTypeList,
  NotificationTypes,
} from '@/notifications/constants/notification-types';
import { NotificationChannel, NotificationChannelList } from '@/notifications/constants/notification-channel';

export class CreateTemplateDto {
  @MinLength(3)
  @MaxLength(100)
  @IsString()
  @ApiProperty({
    description: 'Title of the notification template',
    example: 'Test Notification Template',
  })
  title: string;

  @MinLength(3)
  @IsString()
  @ApiProperty({
    description: 'Message content  of the notification template',
    example: 'This is a test notification template',
  })
  message: string;

  @MaxLength(100)
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Message content of the notification',
    example: 'This is a test notification',
    required: false,
  })
  comment?: string;

  @IsArray()
  @IsEnum(NotificationTypeList, { each: true })
  @ApiProperty({
    description: 'Types of the notification',
    enum: NotificationTypes,
    isArray: true,
    default: [],
    example: [NotificationTypes.email, NotificationTypes.in_app],
  })
  type: NotificationType[];

  @IsString()
  @IsEnum(NotificationChannelList)
  @ApiProperty({
    description: 'Notification channel',
    enum: NotificationChannel,
    required: true,
    example: NotificationChannel.article,
  })
  channel: string;
}
