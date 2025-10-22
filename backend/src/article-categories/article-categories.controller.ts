import {
  Controller,
  Post,
  Body,
  Logger,
  UseGuards,
  Get,
  Patch,
  Param,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { User } from '@/common/decorators/user.decorator';
import { CustomerId } from '@/common/decorators/customer-id.decorator';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { ArticleCategoryDto } from '@/article-categories/dto/article-category.dto';
import { ArticleCategoriesService } from '@/article-categories/article-categories.service';
import { OutputArticleCategoryDto } from '@/article-categories/dto/output-article-category.dto';
import { CreateArticleCategoryDto } from '@/article-categories/dto/create-article-category.dto';
import { UpdateArticleCategoryDto } from '@/article-categories/dto/update-article-category.dto';
import { isSystemAdministrator } from '@/common/utils/user-role-helpers';

@Controller('documents/categories')
@UseGuards(DynamicAuthGuard, ImpersonationGuard, PermissionGuard)
export class ArticleCategoriesController {
  private readonly logger = new Logger(ArticleCategoriesController.name);
  constructor(
    private readonly articlesCategoriesService: ArticleCategoriesService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'The categories list',
    type: OutputArticleCategoryDto,
  })
  async findAll(@User() user: OutputUserDto, @CustomerId() customerId: string) {
    if (!isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    } else if (!customerId && isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    }

    console.log('customerId', user);

    if (!customerId) {
      throw new BadRequestException(
        'User is not authorized to access this resource',
      );
    }
    return await this.articlesCategoriesService.findAll(customerId);
  }

  @Get('/subcategories')
  @ApiOkResponse({
    description: 'The subcategories list',
  })
  async findAllSubcategories(
    @User() user: OutputUserDto,
    @CustomerId() customerId: string,
  ) {
    if (!isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    } else if (!customerId && isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    }

    if (!customerId) {
      throw new BadRequestException(
        'User is not authorized to access this resource',
      );
    }
    return await this.articlesCategoriesService.findAllSubcategories(
      customerId,
    );
  }

  @Post()
  @ApiOkResponse({
    description: 'The category record',
    type: OutputArticleCategoryDto,
  })
  @ApiConflictResponse({
    description: 'Error creating category with provided data',
  })
  async create(
    @User() user: OutputUserDto,
    @Body() createArticleCategoryDto: CreateArticleCategoryDto,
    @CustomerId() customerId: string,
  ) {
    const fields: ArticleCategoryDto = {
      name: createArticleCategoryDto.name,
      about: createArticleCategoryDto.about,
      subcategory: createArticleCategoryDto.subcategory,
      customerId: user.customerId!,
      createdBy: user.id,
      icon: createArticleCategoryDto.icon,
    };
    if (!isSystemAdministrator(user) && user.customerId) {
      fields.customerId = user.customerId;
    } else if (!customerId && isSystemAdministrator(user) && user.customerId) {
      fields.customerId = user.customerId;
    } else {
      fields.customerId = customerId;
    }
    return await this.articlesCategoriesService.create(fields);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'The updated category record',
    type: OutputArticleCategoryDto,
  })
  @ApiConflictResponse({
    description: 'Error updating category with provided data',
  })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id') id: string,
    @User() user: OutputUserDto,
    @Body() updateArticleCategoryDto: UpdateArticleCategoryDto,
    @CustomerId() customerId: string,
  ) {
    if (!isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    } else if (!customerId && isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    }

    if (!customerId) {
      throw new BadRequestException(
        'User is not authorized to access this resource',
      );
    }
    return await this.articlesCategoriesService.update(
      id,
      updateArticleCategoryDto,
      customerId,
    );
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'The category has been successfully deleted',
  })
  @ApiParam({ name: 'id', type: Number })
  async remove(
    @Param('id') id: string,
    @User() user: OutputUserDto,
    @CustomerId() customerId: string,
  ) {
    if (!isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    } else if (!customerId && isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    }

    if (!customerId) {
      throw new BadRequestException(
        'User is not authorized to access this resource',
      );
    }
    return await this.articlesCategoriesService.remove(id, customerId);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'The category record',
    type: OutputArticleCategoryDto,
  })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id') id: string,
    @User() user: OutputUserDto,
    @CustomerId() customerId: string,
  ) {
    if (!isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    } else if (!customerId && isSystemAdministrator(user) && user.customerId) {
      customerId = user.customerId;
    }

    if (!customerId) {
      throw new BadRequestException(
        'User is not authorized to access this resource',
      );
    }
    return await this.articlesCategoriesService.findOne(id, customerId);
  }
}
