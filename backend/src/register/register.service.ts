import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { getDomainFromEmail } from '@/common/helpers/string-helpers';
import { UsersService } from '@/users/users.service';
import { RegisterDto } from '@/register/dto/register.dto';
import { isPublicEmailDomain } from '@/common/helpers/public-email-domains';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { SYSTEM_ROLES } from '@/common/constants/system-roles';

@Injectable()
export class RegisterService {
  constructor(
    private readonly database: DatabaseService,
    private readonly usersService: UsersService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  private async getRoleIdByName(
    roleName: string,
    adminClient: any,
  ): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const { data: role, error: roleError } = await adminClient
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .from('roles')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .select('id')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .eq('name', roleName)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .single();

    if (roleError || !role) {
      throw new Error(`Role ${roleName} not found`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    return role.id;
  }

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

    // Use direct client to bypass RLS for registration
    const adminClient = this.database.getClient();

    // Find existing customer by domain
    const { data: existingCustomer, error: customerError } = await adminClient
      .from('customers')
      .select('*')
      .eq('email_domain', domain)
      .single();

    if (customerError && customerError.code !== 'PGRST116') {
      throw new ConflictException(
        `Failed to check existing customer: ${customerError.message}`,
      );
    }

    const newUser = await this.usersService.create(
      {
        email,
        firstName,
        lastName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        customerId: existingCustomer?.customer_id,
      },
      true,
    );

    if (!existingCustomer) {
      // Create new customer using direct client
      const { data: newCustomer, error: createCustomerError } =
        await adminClient
          .from('customers')
          .insert({
            name: domain,
            email,
            email_domain: domain,
            owner_id: newUser.id,
          })
          .select()
          .single();

      if (createCustomerError) {
        throw new ConflictException(
          `Failed to create customer: ${createCustomerError.message}`,
        );
      }

      // Update user with customer ID and role using direct client
      const { error: updateUserError } = await adminClient
        .from('users')
        .update({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          customer_id: newCustomer.id,
          role_id: await this.getRoleIdByName(
            SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR,
            adminClient,
          ),
        })
        .eq('id', newUser.id);

      if (updateUserError) {
        throw new ConflictException(
          `Failed to update user: ${updateUserError.message}`,
        );
      }
    }

    // Sign up in Supabase
    // await this.signUpInSupabase(registerDto);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const { error } = await this.supabaseService.auth.signUp({
      email: registerDto.email,
      password: registerDto.password,
      options: {
        emailRedirectTo: `${this.configService.get<string>(
          'FRONTEND_URL',
        )}/auth/supabase/callback/implicit`,
        data: {
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        },
      },
    });

    if (error) {
      throw new ConflictException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to sign up in Supabase: ${error?.message}`,
      );
    }

    return newUser;
  }
}
