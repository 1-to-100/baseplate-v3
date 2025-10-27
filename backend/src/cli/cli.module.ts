import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@/common/database/database.module';
import { UsersService } from '@/users/users.service';
import { CustomersService } from '@/customers/customers.service';
import { ArticlesService } from '@/articles/articles.service';
import { ArticleCategoriesService } from '@/article-categories/article-categories.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { TemplatesService } from '@/notifications/templates.service';
import { SupabaseModule } from '@/common/supabase/supabase.module';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';
import { SubscriptionSeederService } from './services/subscription-seeder.service';
import { SeedCommand } from './commands/seed.command';
import { CleanupCommand } from './commands/cleanup.command';
import { CustomerSuccessOwnedCustomersModule } from '@/customer-success-owned-customers/customer-success-owned-customers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    DatabaseModule,
    CustomerSuccessOwnedCustomersModule,
  ],
  providers: [
    UsersService,
    CustomersService,
    ArticlesService,
    ArticleCategoriesService,
    NotificationsService,
    TemplatesService,
    FrontendPathsService,
    SubscriptionSeederService,
    SeedCommand,
    CleanupCommand,
  ],
})
export class CliModule {}
