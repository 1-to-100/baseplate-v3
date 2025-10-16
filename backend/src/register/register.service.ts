import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { getDomainFromEmail } from '@/common/helpers/string-helpers';
import { UsersService } from '@/users/users.service';
import { RegisterDto } from '@/register/dto/register.dto';
import { isPublicEmailDomain } from '@/common/helpers/public-email-domains';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { SYSTEM_ROLE_IDS } from '@/common/constants/system-roles';

@Injectable()
export class RegisterService {
  constructor(
    private readonly database: DatabaseService,
    private readonly usersService: UsersService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { firstName, lastName, email } = registerDto;

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

    const existingCustomer = await this.database.findFirst('customers', {
      where: { domain },
    });

    const newUser = await this.usersService.create(
      {
        email,
        firstName,
        lastName,
        customerId: existingCustomer?.id,
      },
      true,
    );

    if (!existingCustomer) {
      const newCustomer = await this.database.create('customers', {
        data: { name: domain, email, domain, owner_id: newUser.id },
      });

      await this.database.update('users', {
        where: { id: newUser.id },
        data: {
          customer_id: newCustomer.id,
          role_id: SYSTEM_ROLE_IDS.CUSTOMER_ADMINISTRATOR,
        },
      });
    }

    // Sign up in Supabase
    // await this.signUpInSupabase(registerDto);
    const { error } = await this.supabaseService.auth.signUp({
      email: registerDto.email,
      password: registerDto.password,
      options: {
        emailRedirectTo: `${this.configService.get<string>(
          'FRONTEND_URL',
        )}/callback/implicit`,
        data: {
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        },
      },
    });

    if (error) {
      throw new ConflictException(
        `Failed to sign up in Supabase: ${error.message}`,
      );
    }

    return newUser;
  }
}
