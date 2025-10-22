import { IsArray, IsEnum, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginatedInputDto } from '@/common/dto/paginated-input.dto';
import {
  NotificationType,
  NotificationTypes,
} from '@/notifications/constants/notification-types';
import {
  eachNotificationChannelTransformer,
  eachNotificationTypeTransformer,
} from '@/notifications/helpers/class-transform-helpers';
import { NotificationChannel } from '@/notifications/constants/notification-channel';

export class ListTemplatesInputDto extends PaginatedInputDto {
  @IsOptional()
  @IsInt()
  @ApiProperty({
    description: 'Customer ID associated with the notification template',
    required: false,
  })
  customerId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationTypes, { each: true })
  @ApiProperty({
    description: 'Types of the notification',
    enum: NotificationTypes,
    isArray: true,
    default: [],
    required: false,
    example: [NotificationTypes.EMAIL, NotificationTypes.IN_APP],
  })
  @Transform(eachNotificationTypeTransformer)
  type?: NotificationType[];

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @ApiProperty({
    description: 'Notification channels',
    enum: NotificationChannel,
    isArray: true,
    required: false,
    example: [NotificationChannel.article, NotificationChannel.info],
  })
  @Transform(eachNotificationChannelTransformer)
  channel?: string[];
}
