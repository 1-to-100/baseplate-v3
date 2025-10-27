import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { RolesModule } from '@/roles/roles.module';
import { UsersController } from '@/users/users.controller';
import { SystemUsersController } from '@/users/system-users.controller';
import { UsersService } from '@/users/users.service';
import { RoleMigrationService } from '@/users/services/role-migration.service';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CustomerSuccessOwnedCustomersModule } from '@/customer-success-owned-customers/customer-success-owned-customers.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => RolesModule),
    CustomerSuccessOwnedCustomersModule,
  ],
  controllers: [UsersController, SystemUsersController],
  providers: [
    UsersService,
    RoleMigrationService,
    FrontendPathsService,
    SupabaseService,
  ],
  exports: [UsersService, RoleMigrationService],
})
export class UsersModule {}
