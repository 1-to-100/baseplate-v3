import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUPERUSER_KEY } from '@/common/decorators/superuser.decorator';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { DecodedIdToken } from '@/common/types/decoded-token.type';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { SYSTEM_ROLES } from '@/common/constants/system-roles';

@Injectable()
export class RequireSuperuserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedPermissions = this.reflector.getAllAndOverride<string[]>(
      SUPERUSER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{
      user: DecodedIdToken;
      headers: { authorization?: string };
      currentUser: null | OutputUserDto;
    }>();

    const user = request.currentUser;
    if (!user) {
      throw new ForbiddenException('Access denied: user not found');
    }

    if (!user.roleId) {
      throw new ForbiddenException('Access denied: no role assigned');
    }

    // Get user's role information using SupabaseClient
    const { data: userRole, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('name')
      .eq('role_id', user.roleId)
      .single();

    if (error || !userRole) {
      throw new ForbiddenException('Access denied: role not found');
    }

    // Check if user has System Administrator or Customer Success role
    const hasSystemRole =
      userRole.name === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR ||
      userRole.name === SYSTEM_ROLES.CUSTOMER_SUCCESS;

    if (!hasSystemRole) {
      throw new ForbiddenException('Access denied: insufficient privileges');
    }

    let allowed = false;
    allowedPermissions.forEach((permission) => {
      if (
        permission === 'superAdmin' &&
        userRole.name === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR
      ) {
        allowed = true;
      }
      if (
        permission === 'customerSuccess' &&
        userRole.name === SYSTEM_ROLES.CUSTOMER_SUCCESS
      ) {
        allowed = true;
      }
    });

    if (!allowed) {
      throw new ForbiddenException('Access denied');
    }
    return true;
  }
}
