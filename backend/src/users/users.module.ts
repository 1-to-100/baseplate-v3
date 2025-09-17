import { Module } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RolesService } from '@/roles/roles.service';
import { UsersController } from '@/users/users.controller';
import { SystemUsersController } from '@/users/system-users.controller';
import { UsersService } from '@/users/users.service';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Module({
  controllers: [UsersController, SystemUsersController],
  providers: [
    UsersService,
    PrismaService,
    RolesService,
    FrontendPathsService,
    SupabaseService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
