import { Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ArticleCategoriesService } from '@/article-categories/article-categories.service';
import { ArticleCategoriesController } from '@/article-categories/article-categories.controller';
import { RolesService } from '@/roles/roles.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ArticleCategoriesController],
  providers: [ArticleCategoriesService, PrismaService, RolesService],
  exports: [ArticleCategoriesService],
})
export class ArticleCategoriesModule {}
