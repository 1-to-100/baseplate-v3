import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListRolesDto {
  @ApiPropertyOptional({ description: 'search string' })
  @IsString()
  @IsOptional()
  search?: string;
}
