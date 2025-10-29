import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SupabaseUser } from '@/common/decorators/supabase-user.decorator';
import { User } from '@/common/decorators/user.decorator';
import { UsersService } from '@/users/users.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { SupabaseDecodedToken } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { ApiOkResponse } from '@nestjs/swagger';
import { ResetPasswortDto } from '@/auth/dto/reset-passwort.dto';
import { OutputResetPasswortDto } from '@/auth/dto/output-reset-passwort.dto';
import { RefreshContextDto } from '@/auth/dto/refresh-context.dto';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { AuthContextService } from '@/auth/services/auth-context.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly userService: UsersService,
    private readonly authContextService: AuthContextService,
  ) {}

  @Post('/reset-password')
  @ApiOkResponse({
    description: 'The user record',
    type: OutputResetPasswortDto,
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswortDto) {
    return this.userService.resetPassword(resetPasswordDto.email);
  }

  @Post('sync/supabase')
  @UseGuards(SupabaseAuthGuard)
  async syncSupabaseUser(@SupabaseUser() user: SupabaseDecodedToken) {
    if (!user) throw new UnauthorizedException();
    const dbUser = await this.userService.createSupabaseUser(user);

    return {
      message: 'ok',
      user: dbUser,
    };
  }

  /**
   * SECURE ENDPOINT: Validates and updates user context in app_metadata
   * This replaces the insecure header-based approach
   * Frontend must call supabase.auth.refreshSession() after this to get updated JWT
   */
  @Post('refresh-with-context')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({
    description: 'Updates user context claims in app_metadata',
  })
  async refreshWithContext(
    @User() user: OutputUserDto,
    @Body() contextDto: RefreshContextDto,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const result = await this.authContextService.refreshTokenWithContext(
      user.id,
      contextDto,
    );

    return {
      ...result,
      // Include context info for client confirmation
      context: {
        customerId: contextDto.customerId,
        impersonatedUserId: contextDto.impersonatedUserId,
      },
    };
  }

  /**
   * Clears user context claims from JWT
   */
  @Post('clear-context')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({
    description: 'Clears user context',
  })
  async clearContext(@User() user: OutputUserDto) {
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.authContextService.clearContext(user.id);

    return { message: 'Context cleared' };
  }
}
