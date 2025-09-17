import { IsArray, IsEnum, IsInt, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatusList } from '@/common/constants/status';
import { PaginatedInputDto } from '@/common/dto/paginated-input.dto';
import {
  eachArticleStatusTransformer,
  eachNumberTransformer,
} from '@/common/helpers/class-transform-helpers';

export class ListArticlesInputDto extends PaginatedInputDto {
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Category IDs', isArray: true })
  @Transform(eachNumberTransformer)
  categoryId?: number[];

  @IsArray()
  @IsEnum(ArticleStatusList, { each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Statuses',
    enum: ArticleStatusList,
    isArray: true,
  })
  @Transform(eachArticleStatusTransformer)
  status?: string[];
}
