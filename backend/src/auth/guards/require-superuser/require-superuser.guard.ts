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

@Injectable()
export class RequireSuperuserGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    console.log('[[[[SUPERUSER GUARD]]]]');

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
    console.log(user);
    if (!user) {
      throw new ForbiddenException('Access denied: user not found');
    }
    if (!user.isSuperadmin && !user.isCustomerSuccess) {
      throw new ForbiddenException('Access denied');
    }
    let allowed = false;
    allowedPermissions.forEach((permission) => {
      if (permission && permission === 'superAdmin' && user.isSuperadmin) {
        allowed = true;
      }
      if (permission === 'customerSuccess' && user.isCustomerSuccess) {
        allowed = true;
      }
    });

    if (!allowed) {
      throw new ForbiddenException('Access denied');
    }
    return true;
  }
}
