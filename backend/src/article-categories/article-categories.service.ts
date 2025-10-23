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
      const category = await this.database.create('article_categories', {
        data: {
          name: createArticleCategoryDto.name,
          subcategory: createArticleCategoryDto.subcategory,
          about: createArticleCategoryDto.about,
          icon: createArticleCategoryDto.icon,
          customer_id: createArticleCategoryDto.customerId,
          created_by: createArticleCategoryDto.createdBy,
        },
      });
      return {
        id: category.article_category_id,
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
    const categories = await this.database.findMany('article_categories', {
      where: { customer_id: customerId },
    });
    this.logger.log(`Find all categories for customer ${customerId}`);
    return categories.map((cat) => ({
      id: cat.article_category_id,
      name: cat.name,
      subcategory: cat.subcategory ?? null,
      about: cat.about ?? null,
      icon: cat.icon ?? null,
    }));
  }

  async findAllSubcategories(customerId: string) {
    // Using raw Supabase client for distinct query as it's not supported in our CRUD wrapper
    const { data: categories, error } = await this.database
      .getClient()
      .from('article_categories')
      .select('subcategory')
      .eq('customer_id', customerId)
      .not('subcategory', 'is', null)
      .order('subcategory', { ascending: true });

    if (error) {
      throw new ConflictException('Failed to fetch subcategories');
    }

    this.logger.log(`Find all subcategories for customer ${customerId}`);
    // Remove duplicates manually since Supabase doesn't have distinct in the same way
    const uniqueSubcategories = [
      ...new Set(categories?.map((cat) => cat.subcategory).filter(Boolean)),
    ];
    return uniqueSubcategories;
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
      const updateData: any = {};
      if (updateArticleCategoryDto.name !== undefined)
        updateData.name = updateArticleCategoryDto.name;
      if (updateArticleCategoryDto.subcategory !== undefined)
        updateData.subcategory = updateArticleCategoryDto.subcategory;
      if (updateArticleCategoryDto.about !== undefined)
        updateData.about = updateArticleCategoryDto.about;
      if (updateArticleCategoryDto.icon !== undefined)
        updateData.icon = updateArticleCategoryDto.icon;

      const category = await this.database.update('article_categories', {
        where: { article_category_id: id, customer_id: customerId },
        data: updateData,
      });
      return {
        id: category.article_category_id,
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
      await this.database.delete('article_categories', {
        where: {
          article_category_id: id,
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
      const category = await this.database.findFirst('article_categories', {
        where: { article_category_id: id, customer_id: customerId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      return {
        id: category.article_category_id,
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
