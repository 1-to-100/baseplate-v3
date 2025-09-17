import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OutputUserDto } from '@/users/dto/output-user.dto';

export const OriginalUser = createParamDecorator(
  (data: keyof OutputUserDto | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest<{
      currentUser: null | OutputUserDto;
    }>();

    const user = request.currentUser;
    if (!user) return null;
    return data ? user[data] : user;
  },
);
