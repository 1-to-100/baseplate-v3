import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { NotificationsService } from '@/notifications/notifications.service';
import { ArticleDto } from '@/articles/dto/article.dto';
import { NotificationTypes } from '@/notifications/constants/notification-types';
import { ListArticlesInputDto } from '@/articles/dto/list-articles-input.dto';
import { ListArticlesOutputDto } from '@/articles/dto/list-articles-output.dto';
import { UpdateArticleDto } from '@/articles/dto/update-article.dto';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);
  constructor(
    private readonly database: DatabaseService,
    private readonly notificationService: NotificationsService,
  ) {}

  async create(createArticleDto: ArticleDto) {
    try {
      this.logger.log(`Create article with title ${createArticleDto.title}`);

      // Convert camelCase to snake_case for database fields
      const articleData = {
        title: createArticleDto.title,
        category_id: createArticleDto.articleCategoryId,
        subcategory: createArticleDto.subcategory,
        customer_id: createArticleDto.customerId,
        created_by: createArticleDto.createdBy,
        status: createArticleDto.status,
        content: createArticleDto.content,
        video_url: createArticleDto.videoUrl,
        views_number: 0, // Default value
      };

      const article = await this.database.create('articles', {
        data: articleData,
      });

      if (article.status == 'published') {
        await this.notificationService.create({
          title: 'New Article Published',
          message: `A new article "${article.title}" has been published.`,
          channel: 'article',
          type: NotificationTypes.IN_APP,
          customerId: article.customer_id,
          generatedBy: 'system (article service)',
        });
      }

      return article;
    } catch (error) {
      this.logger.error(`Error creating article: ${error}`);
      throw new ConflictException('Article cannot be created.');
    }
  }

  async findAll(
    customerId: string,
    listArticlesInputDto: ListArticlesInputDto,
  ): Promise<PaginatedOutputDto<ListArticlesOutputDto>> {
    const { categoryId, status, search, perPage, page } = listArticlesInputDto;

    // Build where clause for Supabase
    const whereClause: any = {
      customer_id: customerId,
    };

    if (categoryId && categoryId.length > 0) {
      whereClause.category_id = { in: categoryId };
    }

    if (status && status.length > 0) {
      whereClause.status = { in: status };
    }

    // For search, we'll need to use OR conditions
    if (search) {
      whereClause.OR = [
        { title: { ilike: `%${search}%` } },
        { subcategory: { ilike: `%${search}%` } },
        { content: { ilike: `%${search}%` } },
      ];
    }

    // Use the database service's pagination method
    const paginateResult = await this.database.paginate(
      'articles',
      { page: page || 1, per_page: perPage || 10 },
      {
        where: whereClause,
        select: `
          *,
          article_categories!category_id(*),
          users!created_by(id, first_name, last_name)
        `,
        orderBy: [{ field: 'id', direction: 'desc' }],
      },
    );

    const data = paginateResult.data.map((article) => {
      return this.transform(article);
    }) as ListArticlesOutputDto[];

    // Transform meta to match expected format
    const meta = {
      total: paginateResult.meta.total,
      lastPage: paginateResult.meta.total_pages,
      currentPage: paginateResult.meta.page,
      perPage: paginateResult.meta.per_page,
      prev: paginateResult.meta.page > 1 ? paginateResult.meta.page - 1 : null,
      next:
        paginateResult.meta.page < paginateResult.meta.total_pages
          ? paginateResult.meta.page + 1
          : null,
    };

    return { data, meta };
  }

  transform(article: any) {
    return {
      id: article.id,
      title: article.title,
      articleCategoryId: article.category_id,
      subcategory: article.subcategory,
      status: article.status,
      customerId: article.customer_id,
      content: article.content,
      videoUrl: article.video_url,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      viewsNumber: article.views_number,
      Category: article.article_categories
        ? {
            id: article.article_categories?.id,
            name: article.article_categories?.name,
            subcategory: article.article_categories?.subcategory,
            icon: article.article_categories?.icon,
            about: article.article_categories?.about,
            createdAt: article.article_categories?.created_at,
            updatedAt: article.article_categories?.updated_at,
          }
        : null,
      Creator: article.users
        ? {
            id: article.users?.id,
            firstName: article.users?.first_name,
            lastName: article.users?.last_name,
          }
        : null,
    };
  }

  async findOne(
    id: string,
    customerId: string,
  ): Promise<ListArticlesOutputDto> {
    const article = await this.database.findFirst('articles', {
      where: {
        id,
        customer_id: customerId,
      },
      select: `
        *,
        article_categories!category_id(*),
        users!created_by(id, first_name, last_name)
      `,
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    return this.transform(article) as ListArticlesOutputDto;
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    customerId: string,
  ) {
    const article = await this.database.findFirst('articles', {
      where: {
        id,
        customer_id: customerId,
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    // Convert camelCase to snake_case for database fields
    const updateData: any = {};
    if (updateArticleDto.title !== undefined)
      updateData.title = updateArticleDto.title;
    if (updateArticleDto.articleCategoryId !== undefined)
      updateData.category_id = updateArticleDto.articleCategoryId;
    if (updateArticleDto.subcategory !== undefined)
      updateData.subcategory = updateArticleDto.subcategory;
    if (updateArticleDto.status !== undefined)
      updateData.status = updateArticleDto.status;
    if (updateArticleDto.content !== undefined)
      updateData.content = updateArticleDto.content;
    if (updateArticleDto.videoUrl !== undefined)
      updateData.video_url = updateArticleDto.videoUrl;

    const updatedArticle = await this.database.update('articles', {
      where: { id },
      data: updateData,
    });

    // send notification to all users of this customer
    if (
      article.status != updateArticleDto.status &&
      updateArticleDto.status === 'published'
    ) {
      await this.notificationService.create({
        title: 'New Article Published',
        message: `A new article "${updatedArticle.title}" has been published.`,
        channel: 'article',
        type: NotificationTypes.IN_APP,
        customerId,
        generatedBy: 'system (article service)',
      });
    }

    return updatedArticle;
  }

  async remove(id: string, customerId: string) {
    const article = await this.database.findFirst('articles', {
      where: {
        id,
        customer_id: customerId,
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    return this.database.delete('articles', {
      where: { id },
    });
  }
}
