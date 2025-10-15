import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { UsersModule } from '@/users/users.module';
import { DatabaseModule } from '@/common/database/database.module';
import { AuthModule } from '@/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { SystemModulesModule } from '@/system-modules/system-modules.module';
import { RolesModule } from '@/roles/roles.module';
import { ManagersModule } from '@/managers/managers.module';
import { CustomersModule } from '@/customers/customers.module';
import { TaxonomiesModule } from '@/taxonomies/taxonomies.module';
import { SubscriptionsModule } from '@/subscriptions/subscriptions.module';
import { RegisterModule } from '@/register/register.module';
import { ArticleCategoriesModule } from '@/article-categories/article-categories.module';
import { ArticlesModule } from '@/articles/articles.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { SupabaseModule } from '@/common/supabase/supabase.module';
import { validate } from '@/common/config/config.validation';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';
import { BootstrapModule } from '@/common/bootstrap/bootstrap.module';
import { BootstrapService } from '@/common/bootstrap/bootstrap.service';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
      validate,
    }),
    SupabaseModule,
    DatabaseModule, // New database service layer
    BootstrapModule, // Bootstrap service for system initialization
    SystemModulesModule,
    RolesModule,
    ManagersModule,
    CustomersModule,
    TaxonomiesModule,
    SubscriptionsModule,
    RegisterModule,
    // ArticlesModule,
    ArticleCategoriesModule,
    ArticlesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, FrontendPathsService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly bootstrapService: BootstrapService) {}

  async onModuleInit() {
    await this.bootstrapService.ensureSystemAdmin();
  }
}
