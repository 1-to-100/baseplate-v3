import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshContextDto {
  @ApiPropertyOptional({
    description: 'Customer ID to access (must be authorized)',
    example: '123',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'User ID to impersonate (requires permission)',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsUUID()
  impersonatedUserId?: string;
}

