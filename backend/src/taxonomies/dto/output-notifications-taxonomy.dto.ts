import { ApiProperty } from '@nestjs/swagger';
import { NotificationTypeList, NotificationChannelList } from '@/notifications/constants/notification-types';

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
