import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateArticleCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'subcategory name' })
  @IsString()
  @IsOptional()
  subcategory?: string;

  @ApiPropertyOptional({ description: 'subcategory name' })
  @IsString()
  @IsOptional()
  about?: string;

  @ApiPropertyOptional({ description: 'subcategory name' })
  @IsString()
  @IsOptional()
  icon?: string;
}
