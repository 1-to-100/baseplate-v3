import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { ArticleCategoryDto } from '@/article-categories/dto/article-category.dto';
import { OutputArticleCategoryDto } from '@/article-categories/dto/output-article-category.dto';
import { UpdateArticleCategoryDto } from '@/article-categories/dto/update-article-category.dto';
import { generateSlug } from '@/common/helpers/string-helpers';

@Injectable()
export class ArticleCategoriesService {
  private readonly logger = new Logger(ArticleCategoriesService.name);

  constructor(private readonly database: DatabaseService) {}
  async create(
    createArticleCategoryDto: ArticleCategoryDto,
  ): Promise<OutputArticleCategoryDto> {
    try {
      this.logger.log(
        `Create category with name ${createArticleCategoryDto.name}`,
      );
      const category = await this.database.create('help_article_categories', {
        data: {
          name: createArticleCategoryDto.name,
          slug: generateSlug(createArticleCategoryDto.name),
          subcategory: createArticleCategoryDto.subcategory,
          about: createArticleCategoryDto.about,
          icon: createArticleCategoryDto.icon,
          customer_id: createArticleCategoryDto.customerId,
          created_by: createArticleCategoryDto.createdBy,
        },
      });
      return {
        id: category.help_article_category_id,
        name: category.name,
        subcategory: category.subcategory,
        about: category.about,
        icon: category.icon,
      } as OutputArticleCategoryDto;
    } catch (error) {
      this.logger.error(`Error creating category: ${error}`);
      throw new ConflictException('Category cannot be created.');
    }
  }

  async findAll(customerId: string): Promise<OutputArticleCategoryDto[]> {
    // Using raw Supabase client to get categories with article counts
    const { data, error } = await this.database
      .getClient()
      .from('help_article_categories')
      .select('*, help_articles(count)')
      .eq('customer_id', customerId);

    if (error) {
      this.logger.error(`Error fetching categories: ${error.message}`);
      throw new ConflictException('Failed to fetch categories');
    }

    this.logger.log(`Find all categories for customer ${customerId}`);

    return (data || []).map((cat: any) => ({
      id: cat.help_article_category_id,
      name: cat.name,
      subcategory: cat.subcategory ?? null,
      about: cat.about ?? null,
      icon: cat.icon ?? null,
      articlesCount: cat.help_articles?.[0]?.count ?? 0,
    }));
  }

  async findAllSubcategories(customerId: string): Promise<string[]> {
    // Using raw Supabase client for distinct query as it's not supported in our CRUD wrapper
    const { data, error } = await this.database
      .getClient()
      .from('help_article_categories')
      .select('subcategory')
      .eq('customer_id', customerId)
      .not('subcategory', 'is', null)
      .order('subcategory', { ascending: true });

    const categories = data as Array<{ subcategory: string | null }> | null;

    if (error) {
      throw new ConflictException('Failed to fetch subcategories');
    }

    this.logger.log(`Find all subcategories for customer ${customerId}`);
    // Remove duplicates manually since Supabase doesn't have distinct in the same way
    const uniqueSubcategories = [
      ...new Set(categories?.map((cat) => cat.subcategory).filter(Boolean)),
    ];
    return uniqueSubcategories as string[];
  }

  async update(
    id: string,
    updateArticleCategoryDto: UpdateArticleCategoryDto,
    customerId: string,
  ): Promise<OutputArticleCategoryDto> {
    try {
      this.logger.log(
        `Update category ${id} with data: ${JSON.stringify(updateArticleCategoryDto)}`,
      );

      // Convert camelCase to snake_case for database fields
      const updateData: {
        name?: string;
        slug?: string;
        subcategory?: string | null;
        about?: string | null;
        icon?: string | null;
      } = {};
      if (updateArticleCategoryDto.name !== undefined) {
        updateData.name = updateArticleCategoryDto.name;
        updateData.slug = generateSlug(updateArticleCategoryDto.name);
      }
      if (updateArticleCategoryDto.subcategory !== undefined)
        updateData.subcategory = updateArticleCategoryDto.subcategory;
      if (updateArticleCategoryDto.about !== undefined)
        updateData.about = updateArticleCategoryDto.about;
      if (updateArticleCategoryDto.icon !== undefined)
        updateData.icon = updateArticleCategoryDto.icon;

      const category = await this.database.update('help_article_categories', {
        where: { help_article_category_id: id, customer_id: customerId },
        data: updateData,
      });
      return {
        id: category.help_article_category_id,
        name: category.name,
        subcategory: category.subcategory,
        about: category.about,
        icon: category.icon,
      } as OutputArticleCategoryDto;
    } catch (error) {
      this.logger.error(`Error updating category: ${error}`);
      throw new ConflictException('Category cannot be updated.');
    }
  }

  async remove(id: string, customerId: string) {
    try {
      this.logger.log(`Delete category ${id} for customer ${customerId}`);
      await this.database.delete('help_article_categories', {
        where: {
          help_article_category_id: id,
          customer_id: customerId,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`Error deleting category: ${error}`);
      throw new ConflictException('Category cannot be deleted.');
    }
  }

  async findOne(
    id: string,
    customerId: string,
  ): Promise<OutputArticleCategoryDto> {
    try {
      this.logger.log(`Find category ${id} for customer ${customerId}`);
      const category = await this.database.findFirst(
        'help_article_categories',
        {
          where: { help_article_category_id: id, customer_id: customerId },
        },
      );

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      return {
        id: category.help_article_category_id,
        name: category.name,
        subcategory: category.subcategory,
        about: category.about,
        icon: category.icon,
      } as OutputArticleCategoryDto;
    } catch (error) {
      this.logger.error(`Error finding category: ${error}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Category not found');
    }
  }
}
