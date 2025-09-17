import { PartialType } from '@nestjs/swagger';
import { CreateArticleCategoryDto } from '@/article-categories/dto/create-article-category.dto';

export class UpdateArticleCategoryDto extends PartialType(
  CreateArticleCategoryDto,
) {}
