import { Module, Global } from '@nestjs/common';
import { UsersModule } from '@/users/users.module';
import { RolesModule } from '@/roles/roles.module';
import { DatabaseModule } from '@/common/database/database.module';
import { AuthController } from '@/auth/auth.controller';
import { RoleTestController } from '@/auth/controllers/role-test.controller';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { AuthContextService } from '@/auth/services/auth-context.service';

@Global()
@Module({
  imports: [UsersModule, RolesModule, DatabaseModule],
  controllers: [AuthController, RoleTestController],
  providers: [
    SupabaseAuthGuard,
    DynamicAuthGuard,
    ImpersonationGuard,
    PermissionGuard,
    AuthContextService, // Add secure context service
  ],
  exports: [
    SupabaseAuthGuard,
    DynamicAuthGuard,
    ImpersonationGuard,
    PermissionGuard,
    AuthContextService, // Export for use in other modules
    UsersModule, // Export UsersModule so UsersService is available to guards
  ],
})
export class AuthModule {}
