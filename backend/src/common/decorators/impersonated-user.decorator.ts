import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OutputUserDto } from '@/users/dto/output-user.dto';

export const ImpersonatedUser = createParamDecorator(
  (data: keyof OutputUserDto | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest<{
      impersonatedUser?: OutputUserDto;
      isImpersonating?: boolean;
    }>();

    const impersonatedUser = request.impersonatedUser;

    if (!impersonatedUser) return null;
    return data ? impersonatedUser[data] : impersonatedUser;
  },
);
