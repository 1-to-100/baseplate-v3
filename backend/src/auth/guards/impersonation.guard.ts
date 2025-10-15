import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { UserStatus } from '@/common/constants/status';
import {
  isSystemAdministrator,
  isCustomerSuccess,
} from '@/common/utils/user-role-helpers';

@Injectable()
export class ImpersonationGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      currentUser?: OutputUserDto;
      impersonatedUser?: OutputUserDto;
      isImpersonating?: boolean;
      headers: { 'x-impersonate-user-id'?: string };
    }>();

    const impersonateUserIdHeader = request.headers['x-impersonate-user-id'];
    const impersonateUserId = Number(impersonateUserIdHeader);

    if (impersonateUserId && !Number.isInteger(impersonateUserId)) {
      throw new ForbiddenException('Impersonate user id must be an integer');
    }

    if (impersonateUserId && request.currentUser) {
      const user = request.currentUser;

      if (!isSystemAdministrator(user) && !isCustomerSuccess(user)) {
        throw new ForbiddenException(
          'You do not have permission to impersonate users',
        );
      }

      const impersonatedUser =
        await this.usersService.findOne(impersonateUserId);

      if (isSystemAdministrator(impersonatedUser)) {
        throw new ForbiddenException(
          'You cannot impersonate a System Administrator',
        );
      } else if (impersonatedUser.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('You cannot impersonate an inactive user');
      } else if (impersonatedUser.id === request.currentUser.id) {
        throw new ForbiddenException('You cannot impersonate yourself');
      }

      if (
        isSystemAdministrator(user) ||
        (isCustomerSuccess(user) &&
          impersonatedUser.customerId === user.customerId)
      ) {
        request.impersonatedUser = impersonatedUser;
        request.isImpersonating = true;
      } else {
        throw new ForbiddenException(
          'You cannot impersonate users from other companies',
        );
      }
    }

    return true;
  }
}
