import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendTemplatesInputDto {
  @IsOptional()
  @IsInt()
  @ApiProperty({
    description: 'Customer ID associated with the notification template',
    required: false,
    type: Number,
  })
  customerId?: number;

  @IsOptional()
  @IsInt({ each: true })
  @ApiProperty({
    description: 'User IDs to send the notification',
    required: false,
    type: [Number],
  })
  userIds?: number[];
}
