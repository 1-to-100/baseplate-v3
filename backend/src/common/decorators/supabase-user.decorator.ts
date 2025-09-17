import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SupabaseDecodedToken } from '@/auth/guards/supabase-auth/supabase-auth.guard';

export const SupabaseUser = createParamDecorator(
  (
    data: keyof SupabaseDecodedToken | undefined,
    ctx: ExecutionContext,
  ): any => {
    const request = ctx.switchToHttp().getRequest<{
      user: SupabaseDecodedToken;
      headers: { authorization?: string };
    }>();
    const user = request.user;

    if (!user) return null;
    return data ? user[data] : user;
  },
);
