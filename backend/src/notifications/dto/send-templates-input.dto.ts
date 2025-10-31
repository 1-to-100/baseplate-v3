import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendTemplatesInputDto {
  @IsOptional()
  @ApiProperty({
    description: 'Customer ID associated with the notification template',
    required: false,
    type: String,
  })
  customerId?: string;

  @IsOptional()
  @IsString({ each: true })
  @ApiProperty({
    description: 'User IDs to send the notification',
    required: false,
    type: [String],
  })
  userIds?: string[];
}
