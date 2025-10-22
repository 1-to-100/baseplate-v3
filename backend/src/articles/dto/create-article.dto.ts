import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty({ description: 'Title of the article' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'ID of the article category' })
  @IsString()
  articleCategoryId: string;

  @ApiPropertyOptional({ description: 'Subcategory of the article' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({
    description: 'Status of the article',
    default: 'draft',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Content of the article' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'URL of the associated video' })
  @IsOptional()
  @IsString()
  videoUrl?: string;
}
