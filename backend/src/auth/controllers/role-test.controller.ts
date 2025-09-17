import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { RoleGuard } from '@/auth/guards/role/role.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';

@Controller('role-test')
@UseGuards(DynamicAuthGuard, ImpersonationGuard, RoleGuard)
export class RoleTestController {
  @Get('admin')
  @Roles('admin')
  admin() {
    return {
      message: 'ok',
      role: 'admin',
    };
  }

  @Get('manager')
  @Roles('admin', 'manager')
  manager() {
    return {
      message: 'ok',
      role: 'admin or manager',
    };
  }
}
