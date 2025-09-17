import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginatedInputDto } from '@/common/dto/paginated-input.dto';

export class ListCustomersOutputDto extends PaginatedInputDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Name' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({ description: 'Customer email' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Status' })
  status: string;

  @IsInt()
  @ApiPropertyOptional({ description: 'Subscription ID' })
  subscriptionId?: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Subscription name' })
  subscriptionName?: string;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ description: 'Manager Fields' })
  customerSuccess: { id: number; name: string; email: string | null } | null =
    null;

  // @IsOptional()
  // @IsInt()
  // @ApiPropertyOptional({ description: 'Owner Fields' })
  // owner: { id: number; firstName: string; lastName: string | null };

  @IsInt()
  @ApiPropertyOptional({ description: 'Numbers of users' })
  numberOfUsers: number;
}
