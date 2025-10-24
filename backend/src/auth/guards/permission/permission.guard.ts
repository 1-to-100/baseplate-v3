import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { DecodedIdToken } from '@/common/types/decoded-token.type';
import { SYSTEM_MODULES } from '@/system-modules/system-modules.data';
import { SYSTEM_ROLES } from '@/common/constants/system-roles';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
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

    // Check if user has System Administrator role
    if (effectiveUser.roleId) {
      const { data: userRole } = await this.supabaseService
        .getClient()
        .from('roles')
        .select('name')
        .eq('role_id', effectiveUser.roleId)
        .single();

      if (userRole?.name === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR) {
        return true;
      }
    }

    // Check if user has Customer Success role and appropriate permissions
    if (effectiveUser.roleId) {
      const { data: userRole } = await this.supabaseService
        .getClient()
        .from('roles')
        .select('name')
        .eq('role_id', effectiveUser.roleId)
        .single();

      if (userRole?.name === SYSTEM_ROLES.CUSTOMER_SUCCESS) {
        const userManagementPermissions =
          SYSTEM_MODULES.find(
            (module) => module.name === 'UserManagement',
          )?.permissions?.map((permission) => permission.name) || [];

        const hasCustomerSuccessAccess = allowedPermissions.some(
          (permission) =>
            userManagementPermissions.includes(permission) ||
            permission.startsWith('Documents:'),
        );

        if (hasCustomerSuccessAccess) {
          return true;
        }
      }
    }

    // Get customer information using SupabaseClient
    const { data: customer } = await this.supabaseService
      .getClient()
      .from('customers')
      .select('id, owner_id')
      .eq('id', effectiveUser.customerId!)
      .single();

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

    // Get user's role permissions using SupabaseClient
    const { data: userRoleData, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select(
        `
        role_id,
        name,
        permissions:role_permissions(
          permission:permissions(
            name
          )
        )
      `,
      )
      .eq('role_id', effectiveUser.roleId)
      .single();

    if (error || !userRoleData) {
      throw new ForbiddenException('Access denied: role not found');
    }

    const rolePermissions = userRoleData.permissions;
    if (!rolePermissions) {
      throw new ForbiddenException('Access denied: permissions not found');
    }

    let allowed = false;
    (rolePermissions as Array<{ permission: Array<{ name: string }> }>).forEach(
      (rolePermission) => {
        if (
          rolePermission.permission?.[0]?.name &&
          allowedPermissions.includes(rolePermission.permission[0].name)
        ) {
          allowed = true;
        }
      },
    );

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
