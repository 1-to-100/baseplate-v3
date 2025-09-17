import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginatedInputDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Transform(({ value }): number => {
    if (typeof value === 'string') {
      let v = parseInt(value, 10);
      if (v <= 0) {
        v = 1;
      }
      return v;
    }
    if (typeof value === 'number') {
      value = Math.ceil(value);
      if (value <= 0) {
        value = 1;
      }
      return value;
    }
    return 1;
  })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsInt()
  @IsOptional()
  @Transform(({ value }): number => {
    if (typeof value === 'string') {
      let v = parseInt(value, 10);
      if (v <= 0) {
        v = 10;
      }
      return v;
    }
    if (typeof value === 'number') {
      value = Math.ceil(value);
      if (value <= 0) {
        value = 10;
      }
      return value;
    }
    return 1;
  })
  perPage?: number = 10;

  @ApiPropertyOptional({ description: 'search string' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Order by column' })
  @IsString()
  @IsOptional()
  orderBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: 'desc',
    isArray: false,
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection?: string;
}
