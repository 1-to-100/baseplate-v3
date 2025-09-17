import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FirebaseDecodedToken } from '@/common/types/decoded-token.type';
import { OutputUserDto } from '@/users/dto/output-user.dto';

export const User = createParamDecorator(
  (
    data: keyof FirebaseDecodedToken | undefined,
    ctx: ExecutionContext,
  ): any => {
    const request = ctx.switchToHttp().getRequest<{
      currentUser: OutputUserDto | null;
      impersonatedUser?: OutputUserDto;
      isImpersonating?: boolean;
    }>();

    const user = request.isImpersonating
      ? request.impersonatedUser
      : request.currentUser;
    if (!user) return null;

    return data ? user[data] : user;
  },
);

export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const user = ctx
      .switchToHttp()
      .getRequest<{ user?: FirebaseDecodedToken }>().user;
    return user?.uid || null;
  },
);
