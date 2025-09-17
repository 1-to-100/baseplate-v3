import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { SupabaseUser } from '@/common/decorators/supabase-user.decorator';
import { UsersService } from '@/users/users.service';
import { SupabaseDecodedToken } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { ApiOkResponse } from '@nestjs/swagger';
import { ResetPasswortDto } from '@/auth/dto/reset-passwort.dto';
import { OutputResetPasswortDto } from '@/auth/dto/output-reset-passwort.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UsersService) {}

  @Post('/reset-password')
  @ApiOkResponse({
    description: 'The user record',
    type: OutputResetPasswortDto,
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswortDto) {
    return this.userService.resetPassword(resetPasswordDto.email);
  }

  @Post('sync/supabase')
  async syncSupabaseUser(@SupabaseUser() user: SupabaseDecodedToken) {
    if (!user) throw new UnauthorizedException();
    const dbUser = await this.userService.createSupabaseUser(user);

    return {
      message: 'ok',
      user: dbUser,
    };
  }
}
