import { IsOptional, IsInt, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTemplateDto } from '@/notifications/dto/create-template.dto';

export class NotificationTemplateDto extends CreateTemplateDto {
  @IsInt()
  @ApiProperty({ description: 'Notification template ID' })
  id: number;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Customer ID associated with the notification template',
  })
  customerId?: number;

  @ApiPropertyOptional({
    description: 'Customer associated with the notification template',
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Customer ID' },
      name: { type: 'string', description: 'Customer name' },
    },
  })
  Customer?: {
    id: number;
    name: string;
    ownerId?: number;
  };

  @IsDate()
  @ApiProperty({ description: 'Creation date of the notification template' })
  createdAt: Date;
}
