import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SYSTEM_ROLES_KEY } from '@/common/decorators/system-roles.decorator';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { isSystemRole } from '@/common/constants/system-roles';

@Injectable()
export class SystemRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedRoles = this.reflector.getAllAndOverride<string[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    // Validate that all provided roles are valid system roles
    const invalidRoles = allowedRoles.filter((role) => !isSystemRole(role));
    if (invalidRoles.length > 0) {
      throw new Error(
        `Invalid system role(s) specified in @SystemRoles decorator: ${invalidRoles.join(', ')}`,
      );
    }

    const request = context.switchToHttp().getRequest<{
      currentUser: OutputUserDto;
    }>();

    const user = request.currentUser;
    if (!user) {
      throw new ForbiddenException('Access denied: user not found');
    }

    if (!user.roleId) {
      throw new ForbiddenException('Access denied: no role assigned');
    }

    // Get user's role information
    const { data, error } = await this.supabaseService
      .getClient()
      .from('roles')
      .select('role_id, name, description, is_system_role')
      .eq('role_id', user.roleId)
      .single();

    const userRole = data as {
      role_id: string;
      name: string;
      description: string | null;
      is_system_role: boolean;
    } | null;

    if (error || !userRole) {
      throw new ForbiddenException('Access denied: role not found');
    }

    // Check if user has required system role
    const hasRequiredRole = allowedRoles.includes(userRole.name);
    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied: required role(s): ${allowedRoles.join(', ')}`,
      );
    }

    return true;
  }
}
