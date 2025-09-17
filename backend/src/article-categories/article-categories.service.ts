import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ArticleCategoryDto } from '@/article-categories/dto/article-category.dto';
import { OutputArticleCategoryDto } from '@/article-categories/dto/output-article-category.dto';
import { UpdateArticleCategoryDto } from '@/article-categories/dto/update-article-category.dto';

@Injectable()
export class ArticleCategoriesService {
  private readonly logger = new Logger(ArticleCategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}
  async create(
    createArticleCategoryDto: ArticleCategoryDto,
  ): Promise<OutputArticleCategoryDto> {
    try {
      this.logger.log(
        `Create category with name ${createArticleCategoryDto.name}`,
      );
      const category = await this.prisma.articleCategory.create({
        data: createArticleCategoryDto,
      });
      return category as OutputArticleCategoryDto;
    } catch (error) {
      this.logger.error(`Error creating category: ${error}`);
      throw new ConflictException('Category cannot be created.');
    }
  }

  async findAll(customerId: number): Promise<OutputArticleCategoryDto[]> {
    const categories = await this.prisma.articleCategory.findMany({
      where: { customerId },
      include: {
        _count: {
          select: {
            Articles: true,
          },
        },
      },
    });
    this.logger.log(`Find all categories for customer ${customerId}`);
    return categories;
  }

  async findAllSubcategories(customerId: number) {
    const categories = await this.prisma.articleCategory.findMany({
      where: {
        customerId,
        subcategory: {
          not: null,
        },
      },
      select: { subcategory: true },
      distinct: ['subcategory'],
      orderBy: { subcategory: 'asc' },
    });
    this.logger.log(`Find all categories for customer ${customerId}`);
    return categories.map((category) => category.subcategory as string);
  }

  async update(
    id: number,
    updateArticleCategoryDto: UpdateArticleCategoryDto,
    customerId: number,
  ): Promise<OutputArticleCategoryDto> {
    try {
      this.logger.log(
        `Update category ${id} with data: ${JSON.stringify(updateArticleCategoryDto)}`,
      );
      const category = await this.prisma.articleCategory.update({
        where: { id, customerId },
        data: updateArticleCategoryDto,
      });
      return category as OutputArticleCategoryDto;
    } catch (error) {
      this.logger.error(`Error updating category: ${error}`);
      throw new ConflictException('Category cannot be updated.');
    }
  }

  async remove(id: number, customerId: number) {
    try {
      this.logger.log(`Delete category ${id} for customer ${customerId}`);
      await this.prisma.articleCategory.delete({
        where: {
          id,
          customerId,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`Error deleting category: ${error}`);
      throw new ConflictException('Category cannot be deleted.');
    }
  }

  async findOne(
    id: number,
    customerId: number,
  ): Promise<OutputArticleCategoryDto> {
    try {
      this.logger.log(`Find category ${id} for customer ${customerId}`);
      const category = await this.prisma.articleCategory.findFirstOrThrow({
        where: { id, customerId },
        include: {
          _count: {
            select: {
              Articles: true,
            },
          },
        },
      });
      return category as OutputArticleCategoryDto;
    } catch (error) {
      this.logger.error(`Error finding category: ${error}`);
      throw new NotFoundException('Category not found');
    }
  }
}
