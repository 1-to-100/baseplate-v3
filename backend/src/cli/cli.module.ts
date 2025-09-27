import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@/common/database/database.module';
import { UsersService } from '@/users/users.service';
import { CustomersService } from '@/customers/customers.service';
import { ArticlesService } from '@/articles/articles.service';
import { ArticleCategoriesService } from '@/article-categories/article-categories.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { SupabaseModule } from '@/common/supabase/supabase.module';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';
import { SubscriptionSeederService } from './services/subscription-seeder.service';
import { SeedCommand } from './commands/seed.command';
import { CleanupCommand } from './commands/cleanup.command';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    DatabaseModule,
  ],
  providers: [
    UsersService,
    CustomersService,
    ArticlesService,
    ArticleCategoriesService,
    NotificationsService,
    FrontendPathsService,
    SubscriptionSeederService,
    SeedCommand,
    CleanupCommand,
  ],
})
export class CliModule {}
