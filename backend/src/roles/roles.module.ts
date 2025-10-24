import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@/common/database/database.module';
import { UsersModule } from '@/users/users.module';
import { RolesController } from './roles.controller';
import { RolePermissionsController } from './role-permissions.controller';
import { RolesService } from './roles.service';
import { RolePermissionsService } from './role-permissions.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => UsersModule)],
  controllers: [RolesController, RolePermissionsController],
  providers: [RolesService, RolePermissionsService],
  exports: [RolesService, RolePermissionsService],
})
export class RolesModule {}
