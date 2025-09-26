import { Module, Global } from '@nestjs/common';
import { UsersModule } from '@/users/users.module';
import { RolesModule } from '@/roles/roles.module';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuthController } from '@/auth/auth.controller';
import { RoleTestController } from '@/auth/controllers/role-test.controller';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';

@Global()
@Module({
  imports: [UsersModule, RolesModule],
  controllers: [AuthController, RoleTestController],
  providers: [SupabaseAuthGuard, DynamicAuthGuard, ImpersonationGuard, PermissionGuard, PrismaService],
  exports: [SupabaseAuthGuard, DynamicAuthGuard, ImpersonationGuard, PermissionGuard],
})
export class AuthModule {}
