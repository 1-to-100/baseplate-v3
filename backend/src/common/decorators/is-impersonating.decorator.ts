import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IsImpersonating = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest<{
      isImpersonating?: boolean;
    }>();

    return request.isImpersonating || false;
  },
);
