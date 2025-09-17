import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ConflictException,
} from '@nestjs/common';
import { getDomainFromEmail } from '@/common/helpers/string-helpers';
import { UsersService } from '@/users/users.service';
import { RegisterService } from '@/register/register.service';
import { RegisterDto } from '@/register/dto/register.dto';
import { isPublicEmailDomain } from '@/common/helpers/public-email-domains';

@Controller('register')
export class RegisterController {
  constructor(
    private readonly registerService: RegisterService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() registerDto: RegisterDto) {
    return this.registerService.register(registerDto);
  }

  @Get('/validate-code/:code')
  async validateCode(@Param('code') code: string) {
    if (await this.usersService.validateAndVoidOneTimeCode(code)) {
      return { exists: true, message: 'code validated and voided' };
    }
    return { exists: false, message: 'code is not valid' };
  }

  @Get('/validate-email/:email')
  validateEmail(@Param('email') email: string) {
    const domain = getDomainFromEmail(email);
    if (!domain) {
      throw new ConflictException(
        'Email address does not contain a valid domain',
      );
    }
    if (isPublicEmailDomain(domain)) {
      throw new ConflictException(
        'Please use your work email instead of a personal one (@gmail, @yahoo, etc.) to connect with your company. Personal email domains cannot join existing companies.',
      );
    }
  }
}
