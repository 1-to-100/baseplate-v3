import { CreateArticleCategoryDto } from '@/article-categories/dto/create-article-category.dto';

export class ArticleCategoryDto extends CreateArticleCategoryDto {
  customerId: number;
  createdBy: number;
}
