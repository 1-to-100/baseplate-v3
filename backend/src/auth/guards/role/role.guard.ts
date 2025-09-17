import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    console.log('[[[[ROLE GUARD]]]]');
    const request = context
      .switchToHttp()
      .getRequest<{ user: { [key: string]: any } }>();

    const user: { [p: string]: any } = request.user;

    const allowedRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const userRole: string | undefined = user.role as string | undefined;
    if (!userRole) {
      throw new ForbiddenException('Access denied: role not found');
    }

    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Access denied: required role(s): ${allowedRoles.join(', ')}`,
      );
    }

    console.log('user', user);
    return true;
  }
}
