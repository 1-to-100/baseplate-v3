import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '@/roles/roles.service';
import { DatabaseService } from '@/common/database/database.service';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { DecodedIdToken } from '@/common/types/decoded-token.type';
import { SYSTEM_MODULES } from '@/system-modules/system-modules.data';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('[[[[PERMISSION GUARD]]]]');

    const allowedPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // if no permissions are required, allow access
    console.log('allowedPermissions', allowedPermissions);
    if (!allowedPermissions || allowedPermissions.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      user: DecodedIdToken;
      headers: { authorization?: string };
      currentUser: null | OutputUserDto;
      impersonatedUser?: OutputUserDto;
      isImpersonating?: boolean;
    }>();

    const effectiveUser =
      request.isImpersonating && request.impersonatedUser
        ? request.impersonatedUser
        : request.currentUser;

    if (!effectiveUser) {
      throw new ForbiddenException('Access denied: user not found');
    }

    if (effectiveUser.isSuperadmin) {
      return true;
    }

    const userManagementPermissions =
      SYSTEM_MODULES.find(
        (module) => module.name === 'UserManagement',
      )?.permissions?.map((permission) => permission.name) || [];

    const hasCustomerSuccessAccess =
      effectiveUser.isCustomerSuccess &&
      allowedPermissions.some(
        (permission) =>
          userManagementPermissions.includes(permission) ||
          permission.startsWith('Documents:'),
      );

    if (hasCustomerSuccessAccess) {
      return true;
    }

    const customer = effectiveUser.customerId
      ? await this.database.findUnique('customers', {
          where: { id: effectiveUser.customerId },
          select: 'id, owner_id',
        })
      : null;
    console.log('======================');
    console.log(customer);
    console.log(effectiveUser);
    console.log('======================');
    // allow customer owner to access its endpoints
    if (customer && effectiveUser.id == customer.owner_id) {
      return true;
    }
    if (!effectiveUser.roleId) {
      throw new ForbiddenException('Access denied: user has no role assigned');
    }

    const userRole = await this.rolesService.findOne(effectiveUser.roleId);
    if (!userRole) {
      throw new ForbiddenException('Access denied: role not found');
    }
    const rolePermissions = userRole.permissions;
    if (!rolePermissions) {
      throw new ForbiddenException('Access denied: permissions not found');
    }

    let allowed = false;
    rolePermissions.forEach((permission) => {
      if (allowedPermissions.includes(permission.permission.name)) {
        allowed = true;
      }
    });

    if (!allowed) {
      const userContext = request.isImpersonating
        ? `impersonated user (${effectiveUser.email})`
        : `user (${effectiveUser.email})`;
      throw new ForbiddenException(
        `Access denied for ${userContext}: required permission(s): ${allowedPermissions.join(', ')}`,
      );
    }

    console.log('effectiveUser', effectiveUser);
    return true;
  }
}
