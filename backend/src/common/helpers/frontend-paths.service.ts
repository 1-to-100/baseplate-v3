import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FrontendPathsService {
  private readonly home: string;

  constructor(private readonly configService: ConfigService) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!frontendUrl) {
      throw new Error('FRONTEND_URL is not defined or invalid.');
    }

    this.home = frontendUrl;
  }

  getFrontendUrl(): string {
    return this.home;
  }

  getDashboardOverviewUrl(): string {
    return new URL('/dashboard/user-management', this.home).href;
  }

  getSetNewPasswordUrl(): string {
    return new URL('/auth/supabase/set-new-password', this.home).href;
  }

  getUpdatePasswordUrl(): string {
    return new URL('/auth/supabase/update-password', this.home).href;
  }

  getCallbackPkceUrl(): string {
    const callbackPkceUrl = new URL('/auth/supabase/callback/pkce', this.home);
    callbackPkceUrl.searchParams.set('next', '/dashboard/user-management');
    return callbackPkceUrl.href;
  }

  getCallbackImplicitUrl(): string {
    const callbackImplicitUrl = new URL(
      '/auth/supabase/callback/implicit',
      this.home,
    );
    callbackImplicitUrl.searchParams.set('next', '/dashboard/user-management');
    return callbackImplicitUrl.href;
  }
}
