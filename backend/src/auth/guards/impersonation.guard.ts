import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { UserStatus } from '@/common/constants/status';
import { SupabaseDecodedToken } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import {
  isSystemAdministrator,
  isCustomerSuccess,
} from '@/common/utils/user-role-helpers';

@Injectable()
export class ImpersonationGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: SupabaseDecodedToken;
      currentUser?: OutputUserDto;
      impersonatedUser?: OutputUserDto;
      isImpersonating?: boolean;
    }>();

    // SECURE: Extract from JWT app_metadata ONLY (not headers!)
    const impersonateUserId = request.user?.app_metadata?.impersonated_user_id;

    if (!impersonateUserId) {
      // No impersonation requested
      return true;
    }

    if (
      !impersonateUserId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      throw new ForbiddenException('Impersonate user id must be a valid UUID');
    }

    if (!request.currentUser) {
      throw new ForbiddenException('User not authenticated');
    }

    const user = request.currentUser;

    // Verify impersonation is allowed (set during token refresh)
    if (!request.user?.app_metadata?.impersonation_allowed) {
      throw new ForbiddenException(
        'You do not have permission to impersonate users',
      );
    }

    // Double-check role-based permissions (defense in depth)
    if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
      throw new ForbiddenException(
        'You do not have permission to impersonate users',
      );
    }

    // Load impersonated user
    const impersonatedUser = await this.usersService.findOne(impersonateUserId);

    if (!impersonatedUser) {
      throw new ForbiddenException('Target user not found');
    }

    // Verify constraints (defense in depth - already checked during token refresh)
    if (isSystemAdministrator(impersonatedUser)) {
      throw new ForbiddenException(
        'You cannot impersonate a System Administrator',
      );
    }

    if (impersonatedUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('You cannot impersonate an inactive user');
    }

    if (impersonatedUser.id === request.currentUser.id) {
      throw new ForbiddenException('You cannot impersonate yourself');
    }

    if (isCustomerSuccess(user)) {
      if (impersonatedUser.customerId !== user.customerId) {
        throw new ForbiddenException(
          'You cannot impersonate users from other companies',
        );
      }
    }

    // Set impersonation context
    request.impersonatedUser = impersonatedUser;
    request.isImpersonating = true;

    return true;
  }
}
