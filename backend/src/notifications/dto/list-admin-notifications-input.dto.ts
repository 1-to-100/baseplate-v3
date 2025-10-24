import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationTypeList,
  NotificationTypes,
} from '@/notifications/constants/notification-types';
import { PaginatedInputDto } from '@/common/dto/paginated-input.dto';
import { Transform, Type } from 'class-transformer';
import {
  eachNumberTransformer,
  eachStringTransformer,
} from '@/common/helpers/class-transform-helpers';

export class ListAdminNotificationsInputDto extends PaginatedInputDto {
  @IsOptional()
  @IsEnum(NotificationTypeList)
  @ApiProperty({
    description: 'Type of the notification',
    enum: NotificationTypes,
    required: false,
  })
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Read status of the notification',
    required: false,
  })
  isRead?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Notification channels',
    required: false,
    type: String,
    isArray: true,
  })
  @Transform(eachStringTransformer)
  channel?: string[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Customer IDs associated with the notification. Only for System Admin or Customer Success',
    required: false,
    isArray: true,
  })
  @Transform(eachNumberTransformer)
  customerId?: string[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description:
      'User IDs associated with the notification. Only for System Admin or Customer Success',
    required: false,
    isArray: true,
  })
  @Transform(eachNumberTransformer)
  userId?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description:
      'User IDs who generated the notification. Only for System Admin or Customer Success',
    required: false,
    isArray: true,
  })
  @Transform(eachNumberTransformer)
  senderId?: number[];
}
