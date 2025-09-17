import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginatedInputDto } from '@/common/dto/paginated-input.dto';

export class ListArticlesOutputDto extends PaginatedInputDto {
  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ description: 'Id' })
  id: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Title' })
  title: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ description: 'Category ID' })
  articleCategoryId: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Subcategory' })
  subcategory: string | null;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ description: 'Customer ID' })
  customerId: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Status' })
  status: string | null;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Content' })
  content: string | null;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Video URL' })
  videoUrl: string | null;

  @IsDate()
  @IsNotEmpty()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;

  @IsDate()
  @IsNotEmpty()
  @ApiProperty({ description: 'Created At' })
  updatedAt: Date;

  @IsInt()
  @ApiPropertyOptional({ description: 'Number of views' })
  viewsNumber: number | null = 0;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Category Fields' })
  Category: {
    id: number;
    name: string;
    icon: string | null;
    about: string | null;
    subcategory: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  @IsOptional()
  @ApiPropertyOptional({ description: 'Author of the article' })
  Creator: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  };
}
