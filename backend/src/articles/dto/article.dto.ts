import { CreateArticleDto } from '@/articles/dto/create-article.dto';

export class ArticleDto extends CreateArticleDto {
  customerId: number;
  createdBy: number;
}
