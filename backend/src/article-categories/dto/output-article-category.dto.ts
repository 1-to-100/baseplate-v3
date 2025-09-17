import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OutputArticleCategoryDto {
  @ApiProperty({ description: 'Email address' })
  id: number;

  @ApiProperty({ description: 'Category name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'subcategory name' })
  @IsString()
  @IsOptional()
  subcategory: string | null = null;

  @ApiPropertyOptional({ description: 'subcategory name' })
  @IsString()
  @IsOptional()
  about: string | null = null;

  @ApiPropertyOptional({ description: 'subcategory name' })
  @IsString()
  @IsOptional()
  icon: string | null = null;
}
