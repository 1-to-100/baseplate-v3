import { Module, Global } from '@nestjs/common';
import { UsersModule } from '@/users/users.module';
import { AuthController } from '@/auth/auth.controller';
import { RoleTestController } from '@/auth/controllers/role-test.controller';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';

@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController, RoleTestController],
  providers: [SupabaseAuthGuard, DynamicAuthGuard, ImpersonationGuard],
  exports: [SupabaseAuthGuard, DynamicAuthGuard, ImpersonationGuard],
})
export class AuthModule {}
