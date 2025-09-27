import { Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DatabaseModule } from '@/common/database/database.module';
import { ArticlesController } from '@/articles/articles.controller';
import { ArticlesService } from '@/articles/articles.service';
import { RolesService } from '@/roles/roles.service';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, PrismaService, RolesService],
})
export class ArticlesModule {}
