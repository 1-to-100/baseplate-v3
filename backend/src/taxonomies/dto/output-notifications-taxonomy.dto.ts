import { ApiProperty } from '@nestjs/swagger';
import { NotificationTypeList } from '@/notifications/constants/notification-types';
import { NotificationChannelList } from '@/notifications/constants/notification-channel';

export class OutputNotificationsTaxonomyDto {
  @ApiProperty({
    type: [String],
    description: 'List of notification types',
    example: NotificationTypeList,
  })
  types: string[];

  @ApiProperty({
    type: [String],
    description: 'List of notification channels',
    example: NotificationChannelList,
  })
  channels: string[];
}
