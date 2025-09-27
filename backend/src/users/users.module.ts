import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { RolesModule } from '@/roles/roles.module';
import { UsersController } from '@/users/users.controller';
import { SystemUsersController } from '@/users/system-users.controller';
import { UsersService } from '@/users/users.service';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => RolesModule)],
  controllers: [UsersController, SystemUsersController],
  providers: [UsersService, FrontendPathsService, SupabaseService],
  exports: [UsersService],
})
export class UsersModule {}
