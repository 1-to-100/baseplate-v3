import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { User } from '@/common/decorators/user.decorator';
import { CustomerId } from '@/common/decorators/customer-id.decorator';
import { ApiOkResponse, ApiConflictResponse, ApiParam } from '@nestjs/swagger';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { ArticlesService } from '@/articles/articles.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { CreateArticleDto } from '@/articles/dto/create-article.dto';
import { ListArticlesInputDto } from '@/articles/dto/list-articles-input.dto';
import { UpdateArticleDto } from '@/articles/dto/update-article.dto';
import { ArticleDto } from '@/articles/dto/article.dto';
import { isSystemAdministrator } from '@/common/utils/user-role-helpers';

@Controller('documents/articles')
@UseGuards(DynamicAuthGuard, ImpersonationGuard, PermissionGuard)
export class ArticlesController {
  private readonly logger = new Logger(ArticlesController.name);

  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @ApiOkResponse({ description: 'The article has been created' })
  @ApiConflictResponse({
    description: 'Error creating article with provided data',
  })
  async create(
    @User() user: OutputUserDto,
    @Body() createArticleDto: CreateArticleDto,
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
    const fields: ArticleDto = {
      ...createArticleDto,
      customerId,
      createdBy: user.id,
    };
    return await this.articlesService.create(fields);
  }

  @Get()
  @ApiOkResponse({ description: 'The articles list' })
  async findAll(
    @User() user: OutputUserDto,
    @CustomerId() customerId: string,
    @Query() listArticlesInputDto: ListArticlesInputDto,
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
    return await this.articlesService.findAll(customerId, listArticlesInputDto);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'The article record' })
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
    return await this.articlesService.findOne(id, customerId);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'The article has been updated' })
  @ApiConflictResponse({
    description: 'Error updating article with provided data',
  })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
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
    return await this.articlesService.update(id, updateArticleDto, customerId);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'The article has been deleted' })
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
    return await this.articlesService.remove(id, customerId);
  }
}
