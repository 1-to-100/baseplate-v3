import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { UserStatus } from '@/common/constants/status';

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
      const { isSuperadmin, isCustomerSuccess, customerId } =
        request.currentUser;

      if (!isSuperadmin && !isCustomerSuccess) {
        throw new ForbiddenException(
          'You do not have permission to impersonate users',
        );
      }

      const impersonatedUser =
        await this.usersService.findOne(impersonateUserId);

      if (impersonatedUser.isSuperadmin) {
        throw new ForbiddenException(
          'You cannot impersonate a superadmin user',
        );
      } else if (impersonatedUser.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('You cannot impersonate an inactive user');
      } else if (impersonatedUser.id === request.currentUser.id) {
        throw new ForbiddenException('You cannot impersonate yourself');
      }

      if (
        isSuperadmin ||
        (isCustomerSuccess && impersonatedUser.customerId === customerId)
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
