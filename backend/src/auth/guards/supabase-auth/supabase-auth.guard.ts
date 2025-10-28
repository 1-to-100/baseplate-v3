import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '@/users/users.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@/common/constants/status';

export type SupabaseDecodedToken = {
  uid: string; // sub
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
  permissions?: string[];
  status?: string;
};

type supabaseJwtPayload =
  | (jwt.JwtPayload & {
      user_metadata: {
        full_name?: string;
        firstName?: string; // google
        lastName?: string; // google
        given_name?: string; // linkedin
        family_name?: string; // linkedin
        picture?: string;
      };
    })
  | null;

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly supabaseSecret: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    // SECURE: Explicit validation following SupabaseService pattern
    const secret = this.configService.get<string>('SUPABASE_JWT_SECRET');

    if (!secret) {
      throw new Error(
        'SUPABASE_JWT_SECRET is required but not configured. ' +
          'Please check your environment configuration.',
      );
    }

    this.supabaseSecret = secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: SupabaseDecodedToken;
      headers: { authorization?: string };
      currentUser: null | OutputUserDto;
    }>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or invalid',
      );
    }

    const token = authHeader.split(' ')[1];
    let decodedPayload: supabaseJwtPayload;
    try {
      decodedPayload = jwt.verify(
        token,
        this.supabaseSecret,
      ) as supabaseJwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (!decodedPayload || typeof decodedPayload !== 'object') {
      throw new UnauthorizedException('Invalid token');
    }

    const { firstName, lastName, full_name, given_name, family_name, picture } =
      decodedPayload.user_metadata || {};

    const fullName =
      full_name ||
      (firstName && lastName ? `${firstName} ${lastName}` : '') ||
      (given_name && family_name ? `${given_name} ${family_name}` : '');

    if (!decodedPayload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    request.user = {
      uid: decodedPayload.sub,
      email: decodedPayload.email as string,
      name: fullName,
      picture,
    };

    const currentUser = await this.usersService.findByUid(request.user.uid);
    if (currentUser) {
      request.currentUser = currentUser;
      if (currentUser.deletedAt) {
        throw new UnauthorizedException('User not found');
      }
    } else {
      // sync supabse user if not found
      const updatedCurrentUser = await this.usersService.createSupabaseUser(
        request.user,
      );

      request.currentUser = updatedCurrentUser;
    }

    if (!request.currentUser) {
      throw new UnauthorizedException('User not found');
    }

    if (
      UserStatus.INACTIVE === request.currentUser.status ||
      UserStatus.SUSPENDED === request.currentUser.status
    ) {
      throw new UnauthorizedException(
        'User is not active. Please contact support.',
      );
    }

    return true;
  }
}
