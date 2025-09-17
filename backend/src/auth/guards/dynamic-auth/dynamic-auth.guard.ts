import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getProviderFromToken } from '@/common/helpers/token-helpers';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth/supabase-auth.guard';

@Injectable()
export class DynamicAuthGuard implements CanActivate {
  constructor(private readonly supabaseAuthGuard: SupabaseAuthGuard) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();
    const token = request.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    const tokenProvider = getProviderFromToken(token);

    if (tokenProvider == 'supabase') {
      return this.supabaseAuthGuard.canActivate(context);
    } else {
      throw new UnauthorizedException('Invalid token type');
    }
  }
}
