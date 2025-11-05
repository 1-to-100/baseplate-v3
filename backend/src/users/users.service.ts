import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { getDomainFromEmail } from '@/common/helpers/string-helpers';
import {
  parseUserName,
  buildUserDbData,
} from '@/common/helpers/schema-mappers';
import { UserSystemRoles } from '@/common/constants/user-system-roles';
import { SYSTEM_ROLES } from '@/common/constants/system-roles';
import {
  UserStatus,
  Role,
  CustomerLifecycleStage,
} from '@/common/types/database.types';
import { UserOrderByFields } from '@/common/constants/status';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { CreateSystemUserDto } from '@/users/dto/create-system-user.dto';
import { UpdateSystemUserDto } from '@/users/dto/update-system-user.dto';
import { InviteUserDto } from '@/users/dto/invite-user.dto';
import { CheckUserExistsDto } from '@/users/dto/check-user-exists.dto';
import { ListUsersInputDto } from '@/users/dto/list-users-input.dto';
import { UpdateUserDto } from '@/users/dto/update-user.dto';
import { SupabaseDecodedToken } from '@/auth/guards/supabase-auth/supabase-auth.guard';
import { isPublicEmailDomain } from '@/common/helpers/public-email-domains';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';
import { CustomerSuccessOwnedCustomersService } from '@/customer-success-owned-customers/customer-success-owned-customers.service';

// Helper to convert database User to OutputUserDto with proper type handling
function mapUserToDto(user: any): OutputUserDto {
  if (!user) return user;

  // Parse full_name into firstName and lastName for DTO
  const { firstName, lastName } = parseUserName(user.full_name || '');

  return {
    id: user.user_id,
    uid: user.auth_user_id,
    email: user.email,
    emailVerified: user.email_verified,
    firstName,
    lastName,
    avatar: user.avatar_url,
    phoneNumber: user.phone_number,
    customerId: user.customer_id,
    roleId: user.role_id,
    managerId: user.manager_id,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    deletedAt: user.deleted_at,
    // Include relations if they exist
    ...(user.customer && { customer: user.customer }),
    ...(user.customers && { customer: user.customers }),
    ...(user.role && {
      role: {
        id: user.role.role_id,
        name: user.role.name,
        description: user.role.description,
        systemRole: user.role.is_system_role,
      },
    }),
    ...(user.roles && {
      role: {
        id: user.roles.role_id,
        name: user.roles.name,
        description: user.roles.description,
        systemRole: user.roles.is_system_role,
        display_name: user.roles.display_name,
      },
    }),
    ...(user.manager && { manager: user.manager }),
    ...(user.managers && { manager: user.managers }),
    // Add permissions if they exist
    ...(user.permissions && { permissions: user.permissions }),
  } as OutputUserDto;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly supabaseService: SupabaseService,
    private readonly frontendPathsService: FrontendPathsService,
    private readonly csOwnedCustomersService: CustomerSuccessOwnedCustomersService,
  ) {}

  private async getRoleIdByName(roleName: string): Promise<string> {
    const { data: role } = await this.database
      .getClient()
      .from('roles')
      .select('role_id')
      .eq('name', roleName)
      .single();

    if (!role) {
      throw new ConflictException(`Role ${roleName} not found`);
    }

    return role.role_id;
  }

  private async getSystemRoleIds(): Promise<string[]> {
    const { data: roles } = await this.database
      .getClient()
      .from('roles')
      .select('role_id')
      .in('name', [
        SYSTEM_ROLES.SYSTEM_ADMINISTRATOR,
        SYSTEM_ROLES.CUSTOMER_SUCCESS,
      ]);

    return roles?.map((role) => role.role_id) || [];
  }

  async create(
    createUserDto: CreateUserDto,
    skipInvite: boolean = false,
  ): Promise<OutputUserDto> {
    if (await this.emailExists({ email: createUserDto.email })) {
      throw new ConflictException('User with this email already exists');
    }

    let user: any = null;

    try {
      this.logger.log(`Create user with email ${createUserDto.email}`);

      // Use helper to build database data with proper field names
      const userData = buildUserDbData({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phoneNumber: createUserDto.phoneNumber,
        customerId: createUserDto.customerId,
        roleId: createUserDto.roleId,
        managerId: createUserDto.managerId,
        status: createUserDto.status || UserStatus.INACTIVE,
      });

      user = await this.database.create('users', {
        data: userData,
      });
    } catch (error) {
      this.logger.error(`Error creating user: ${error}`);
      if (typeof error == 'string') {
        throw new ConflictException('User cannot be created.' + error);
      } else if (error instanceof Error) {
        throw new ConflictException('User cannot be created.' + error.message);
      } else {
        throw new ConflictException('User cannot be created.');
      }
    }

    if (!skipInvite && user) {
      await this.sendInviteEmail(mapUserToDto(user));
    }

    return mapUserToDto(user);
  }

  async createSystemUser(
    createSystemUserDto: CreateSystemUserDto,
    skipInvite: boolean = false,
  ): Promise<OutputUserDto> {
    if (await this.emailExists({ email: createSystemUserDto.email })) {
      throw new ConflictException('User with this email already exists');
    }

    const { systemRole, ...makeUser } = createSystemUserDto;
    const isSuperadmin = systemRole === UserSystemRoles.SYSTEM_ADMIN;
    const isCustomerSuccess = systemRole === UserSystemRoles.CUSTOMER_SUCCESS;

    if (!(isSuperadmin || isCustomerSuccess)) {
      throw new ConflictException('Invalid system role');
    }

    if (isCustomerSuccess && createSystemUserDto.customerId) {
      const customer = await this.database.findUnique('customers', {
        where: { customer_id: createSystemUserDto.customerId },
      });

      if (!customer) {
        throw new ConflictException('Customer not found');
      }
    }

    const roleId = await this.getRoleIdByName(systemRole);

    let user: any = null;

    try {
      // Use helper to build database data
      const userData = buildUserDbData({
        email: makeUser.email,
        firstName: makeUser.firstName,
        lastName: makeUser.lastName,
        phoneNumber: makeUser.phoneNumber,
        customerId: makeUser.customerId,
        roleId: roleId,
        managerId: makeUser.managerId,
        status: makeUser.status || UserStatus.INACTIVE,
      });

      user = await this.database.create('users', {
        data: userData,
      });

      // attach customer success to customer using new customer_success_owned_customers table
      if (isCustomerSuccess && createSystemUserDto.customerId) {
        // Create assignment in the new table
        await this.csOwnedCustomersService.create({
          user_id: user.user_id,
          customer_id: createSystemUserDto.customerId,
        });
      }
    } catch (error) {
      this.logger.error(`Error creating user: ${error}`);
      if (typeof error == 'string') {
        throw new ConflictException('User cannot be created.' + error);
      } else if (error instanceof Error) {
        throw new ConflictException('User cannot be created.' + error.message);
      } else {
        throw new ConflictException('User cannot be created.');
      }
    }

    if (!skipInvite && user) {
      await this.sendInviteEmail(mapUserToDto(user));
    }

    return mapUserToDto(user);
  }

  async invite(inviteUserDto: InviteUserDto): Promise<OutputUserDto> {
    if (await this.emailExists({ email: inviteUserDto.email })) {
      throw new ConflictException('User with this email already exists');
    }

    if (inviteUserDto.customerId) {
      const customer = await this.database.findUnique('customers', {
        where: { customer_id: inviteUserDto.customerId },
      });
      if (!customer) {
        throw new ConflictException('Customer not found');
      }
    }

    // Use helper to build database data
    const userData = buildUserDbData({
      email: inviteUserDto.email,
      firstName: '', // Provide empty string to ensure full_name is set
      lastName: '', // Will result in 'Unnamed User' via combineUserName
      customerId: inviteUserDto.customerId,
      roleId: inviteUserDto.roleId,
      managerId: inviteUserDto.managerId,
      status: UserStatus.INACTIVE,
    });

    const user = await this.database.create('users', {
      data: userData,
    });

    await this.sendInviteEmail(mapUserToDto(user));
    return mapUserToDto(user);
  }

  async getUserByEmail(email: string): Promise<OutputUserDto | null> {
    const user = await this.database.findFirst('users', {
      where: { email, deleted_at: null },
    });
    return mapUserToDto(user);
  }

  async resendInviteEmail(email: string): Promise<OutputUserDto> {
    const user = await this.database.findFirst('users', {
      where: { email, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    } else if (user.status === UserStatus.ACTIVE) {
      throw new ConflictException('User is already active');
    }

    await this.sendInviteEmail(mapUserToDto(user));
    return mapUserToDto(user);
  }

  async checkEmailExists(checkUserExistsDto: CheckUserExistsDto) {
    return {
      exists: await this.emailExists(checkUserExistsDto),
    };
  }

  async emailExists(checkUserExistsDto: CheckUserExistsDto) {
    const user = await this.database.findFirst('users', {
      where: { email: checkUserExistsDto.email },
    });

    return !!user;
  }

  async emailsExists(emails: string[]): Promise<string[]> {
    const existingUsers = await this.database.findMany('users', {
      select: 'email',
      where: {
        deleted_at: null,
        email: { in: emails },
      },
    });

    return existingUsers.map((user) => user.email);
  }

  async findAll(
    listUsersInput: ListUsersInputDto,
  ): Promise<PaginatedOutputDto<OutputUserDto>> {
    const {
      roleId,
      customerId,
      hasCustomer,
      status,
      search,
      page,
      perPage,
      orderBy,
      orderDirection,
    } = listUsersInput;

    this.logger.debug(status);
    this.logger.debug(listUsersInput);

    // Build where conditions using snake_case database column names
    const where: any = {
      ...(roleId
        ? { role_id: { in: roleId } }
        : {
            OR: [
              { role_id: null },
              { role_id: { not: { in: await this.getSystemRoleIds() } } },
            ],
          }),
      ...(customerId && { customer_id: { in: customerId } }),
      ...(hasCustomer === true
        ? { customer_id: { not: null } }
        : hasCustomer === false
          ? { customer_id: null }
          : {}),
      ...(status && { status: { in: status } }),
      ...(search && {
        OR: [
          { full_name: { contains: search } }, // Search in full_name now
          { email: { contains: search } },
        ],
      }),
      deleted_at: null,
    };

    const applyOrderByField = this.applyOrderParams(orderBy, orderDirection);

    const result = await this.database.paginate(
      'users',
      { page: page || 1, per_page: perPage || 10 },
      {
        where,
        orderBy: applyOrderByField,
        select: `
          *,
          roles!role_id(*),
          customers!customer_id(customer_id, name, owner_id)
        `,
      },
    );

    return {
      data: result.data.map(mapUserToDto),
      meta: {
        total: result.meta.total,
        lastPage: result.meta.total_pages,
        currentPage: result.meta.page,
        perPage: result.meta.per_page,
        prev: result.meta.page > 1 ? result.meta.page - 1 : null,
        next:
          result.meta.page < result.meta.total_pages
            ? result.meta.page + 1
            : null,
      },
    };
  }

  async findAllSystemUsers(
    listUsersInput: ListUsersInputDto,
  ): Promise<PaginatedOutputDto<OutputUserDto>> {
    const {
      roleId,
      customerId,
      status,
      search,
      orderBy,
      orderDirection,
      perPage,
      page,
    } = listUsersInput;

    this.logger.debug(status);
    this.logger.debug(listUsersInput);

    const where: any = {
      ...(roleId && { role_id: { in: roleId } }),
      ...(customerId && { customer_id: { in: customerId } }),
      ...(status && { status: { in: status } }),
      ...(search && {
        OR: [
          { full_name: { contains: search } }, // Search in full_name now
          { email: { contains: search } },
        ],
      }),
      // Include only system roles
      role_id: {
        in: await this.getSystemRoleIds(),
      },
      deleted_at: null,
    };

    const applyOrderByField = this.applyOrderParams(orderBy, orderDirection);

    const result = await this.database.paginate(
      'users',
      { page: page || 1, per_page: perPage || 10 },
      {
        where,
        orderBy: applyOrderByField,
        select: `
          *,
          roles!role_id(*),
          customers!customer_id(customer_id, name, owner_id)
        `,
      },
    );

    return {
      data: result.data.map(mapUserToDto),
      meta: {
        total: result.meta.total,
        lastPage: result.meta.total_pages,
        currentPage: result.meta.page,
        perPage: result.meta.per_page,
        prev: result.meta.page > 1 ? result.meta.page - 1 : null,
        next:
          result.meta.page < result.meta.total_pages
            ? result.meta.page + 1
            : null,
      },
    };
  }

  async findOne(
    id: string,
    customerId: string | null = null,
  ): Promise<OutputUserDto> {
    const where: any = customerId
      ? { user_id: id, customer_id: customerId, deleted_at: null }
      : { user_id: id, deleted_at: null };

    const user = await this.database.findFirst('users', {
      where,
      select: `
        *,
        roles!role_id(*),
        customers!customer_id(customer_id, name, owner_id),
        managers!manager_id(*)
      `,
    });

    if (!user) {
      throw new NotFoundException('No user with given ID exists');
    }

    let userPermissions: string[] = [];
    if (user.role_id) {
      // Get permissions from role's JSONB field
      const role = await this.database.findUnique('roles', {
        where: { role_id: user.role_id },
      });

      if (role && role.permissions) {
        // Parse permissions from JSONB array
        userPermissions = Array.isArray(role.permissions)
          ? role.permissions
          : [];
      }
    }

    return mapUserToDto({ ...user, permissions: userPermissions });
  }

  async findOneSystemUser(id: string): Promise<OutputUserDto> {
    const where: any = {
      user_id: id,
      role_id: {
        in: await this.getSystemRoleIds(),
      },
      deleted_at: null,
    };

    const user = await this.database.findFirst('users', {
      where,
      select: `
        *,
        roles!role_id(*),
        customers!customer_id(customer_id, name),
        managers!manager_id(*)
      `,
    });

    if (!user) {
      throw new NotFoundException('No user with given ID exists');
    }

    return mapUserToDto(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    updatedBy?: OutputUserDto,
  ): Promise<OutputUserDto> {
    if (updateUserDto.email) {
      updateUserDto.email = undefined;
    }

    const whereClause: any = { user_id: id, deleted_at: null };
    if (updateUserDto.customerId) {
      whereClause.customer_id = updateUserDto.customerId;
    }

    const existingUser = await this.database.findFirst('users', {
      where: whereClause,
    });

    if (!existingUser) {
      throw new NotFoundException('No user with given ID exists');
    }

    // Get user role if exists
    let userRole: Role | null = null;
    if (existingUser.role_id) {
      userRole = await this.database.findUnique('roles', {
        where: { role_id: existingUser.role_id },
      });
    }

    if (updatedBy && updateUserDto.status) {
      if (updatedBy.id === id) {
        throw new ConflictException('You cannot change your own status');
      } else if (
        userRole?.name === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR ||
        userRole?.name === SYSTEM_ROLES.CUSTOMER_SUCCESS
      ) {
        throw new ConflictException(
          'You cannot change status of system administrator or customer success user',
        );
      }

      // Only interact with Supabase if the user has an auth_user_id
      if (existingUser.auth_user_id) {
        if (
          updateUserDto.status === UserStatus.SUSPENDED &&
          existingUser.status == UserStatus.ACTIVE
        ) {
          await this.supabaseService.banUser(existingUser.auth_user_id);
        } else if (
          updateUserDto.status === UserStatus.ACTIVE &&
          existingUser.status == UserStatus.SUSPENDED
        ) {
          await this.supabaseService.unbanUser(existingUser.auth_user_id);
        }
      }
    }

    const updateWhereClause: any = { user_id: id };
    if (updateUserDto.customerId) {
      updateWhereClause.customer_id = updateUserDto.customerId;
    }

    // Use helper to build update data with proper field names
    const updateData = buildUserDbData({
      email: updateUserDto.email,
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      phoneNumber: updateUserDto.phoneNumber,
      customerId: updateUserDto.customerId,
      roleId: updateUserDto.roleId,
      managerId: updateUserDto.managerId,
      status: updateUserDto.status,
    });

    const user = await this.database.update('users', {
      where: updateWhereClause,
      data: updateData,
    });

    return mapUserToDto(user);
  }

  async updateSystemUser(
    id: string,
    updateSystemUserDto: UpdateSystemUserDto,
    updatedBy?: OutputUserDto,
  ): Promise<OutputUserDto> {
    if (updateSystemUserDto.email) {
      updateSystemUserDto.email = undefined;
    }

    const existingUser = await this.findOneSystemUser(id);
    if (!existingUser) {
      throw new NotFoundException('No user with given ID exists');
    }

    if (updatedBy && updateSystemUserDto.status) {
      if (updatedBy.id === id) {
        throw new ConflictException('You cannot change your own status');
      }
    }

    const { systemRole, ...updateUser } = updateSystemUserDto;
    const isSuperadmin = systemRole === UserSystemRoles.SYSTEM_ADMIN;
    const isCustomerSuccess = systemRole === UserSystemRoles.CUSTOMER_SUCCESS;

    if (systemRole) {
      if (!(isSuperadmin || isCustomerSuccess)) {
        throw new ConflictException('Invalid system role');
      }

      if (isCustomerSuccess && !updateSystemUserDto.customerId) {
        throw new ConflictException(
          'Customer ID is required for Customer Success role',
        );
      } else if (isCustomerSuccess && updateSystemUserDto.customerId) {
        const customer = await this.database.findUnique('customers', {
          where: { customer_id: updateSystemUserDto.customerId },
        });
        if (!customer) {
          throw new ConflictException('Customer not found');
        }
      }
    }

    // Use helper to build update data
    const updateData = buildUserDbData({
      firstName: updateUser.firstName,
      lastName: updateUser.lastName,
      phoneNumber: updateUser.phoneNumber,
      customerId: updateUser.customerId,
      roleId: updateUser.roleId,
      managerId: updateUser.managerId,
      status: updateUser.status,
    });

    // Update role_id based on system role
    if (systemRole) {
      const roleName = isSuperadmin
        ? SYSTEM_ROLES.SYSTEM_ADMINISTRATOR
        : SYSTEM_ROLES.CUSTOMER_SUCCESS;
      updateData.role_id = await this.getRoleIdByName(roleName);
    }

    // Clear customer_id for superadmin
    if (isSuperadmin) {
      updateData.customer_id = null;
    }

    const user = await this.database.update('users', {
      where: { user_id: id, deleted_at: null },
      data: updateData,
    });

    // attach customer success to customer using new customer_success_owned_customers table
    if (isSuperadmin) {
      // Remove all customer success assignments for this user
      await this.database.deleteMany('customer_success_owned_customers', {
        where: { user_id: id },
      });
    } else if (isCustomerSuccess && updateSystemUserDto.customerId) {
      // Check if assignment already exists
      const existingAssignment = await this.database.findFirst(
        'customer_success_owned_customers',
        {
          where: {
            user_id: user.user_id,
            customer_id: updateSystemUserDto.customerId,
          },
        },
      );

      // Create assignment if it doesn't exist
      if (!existingAssignment) {
        await this.database.create('customer_success_owned_customers', {
          data: {
            user_id: user.user_id,
            customer_id: updateSystemUserDto.customerId,
          },
        });
      }
    }

    return mapUserToDto(user);
  }

  async findByUid(uid: string): Promise<OutputUserDto | null> {
    const user = await this.database.findUnique('users', {
      where: { auth_user_id: uid }, // Changed from uid
      include: {
        role: true,
        customer: true,
      },
    });
    return user ? mapUserToDto(user) : null;
  }

  async createSupabaseUser(
    supabaseUser: SupabaseDecodedToken,
    subscriptionId: string | null = null, // Changed from number
  ): Promise<OutputUserDto> {
    try {
      const existingUser = await this.findByUid(supabaseUser.uid);
      if (existingUser) {
        this.logger.log(`User with UID ${supabaseUser.uid} already exists`);
        return existingUser;
      }

      const [firstName, ...lastNameParts] = supabaseUser.name?.split(' ') || [];
      const lastName = lastNameParts ? lastNameParts.join(' ') : '';
      const email = supabaseUser.email!;
      const domain = getDomainFromEmail(email);

      if (!domain) throw new ConflictException('Invalid email domain');
      if (isPublicEmailDomain(domain))
        throw new ConflictException('Public email domains are not allowed');

      const existingUserEmail = await this.database.findUnique('users', {
        where: { email },
      });

      if (
        existingUserEmail &&
        existingUserEmail.auth_user_id == null &&
        supabaseUser.uid
      ) {
        const userData = buildUserDbData({
          authUserId: supabaseUser.uid,
          status: UserStatus.ACTIVE,
          firstName,
          lastName,
        });

        await this.database.update('users', {
          where: { user_id: existingUserEmail.user_id },
          data: userData,
        });

        // Refetch user with role relation
        const existingUserEmailUpdated = await this.database.findUnique(
          'users',
          {
            where: { user_id: existingUserEmail.user_id },
            include: {
              role: true,
              customer: true,
            },
          },
        );

        return mapUserToDto(existingUserEmailUpdated!);
      }

      // Check if user with this email and auth_user_id already exists
      if (
        existingUserEmail &&
        existingUserEmail.auth_user_id === supabaseUser.uid
      ) {
        this.logger.log(
          `User with email ${email} and UID ${supabaseUser.uid} already exists`,
        );
        const userWithRole = await this.database.findUnique('users', {
          where: { user_id: existingUserEmail.user_id },
          include: {
            role: true,
            customer: true,
          },
        });
        return mapUserToDto(userWithRole!);
      }

      const existingCustomer = await this.database.findFirst('customers', {
        where: { email_domain: domain }, // Changed from domain
      });

      const userData = buildUserDbData({
        email,
        firstName,
        lastName,
        avatar: supabaseUser.picture,
        authUserId: supabaseUser.uid,
        status: supabaseUser.uid ? UserStatus.ACTIVE : UserStatus.INACTIVE,
        customerId: existingCustomer?.customer_id,
      });

      const newUser = await this.database.create('users', {
        data: userData,
      });

      if (!existingCustomer) {
        // This is the first user from this domain - assign customer_admin role
        const customerAdminRoleId = await this.getRoleIdByName(
          SYSTEM_ROLES.CUSTOMER_ADMINISTRATOR,
        );

        const newCustomer = await this.database.create('customers', {
          data: {
            name: domain,
            email_domain: domain, // Changed from domain
            owner_id: newUser.user_id,
            subscription_type_id: subscriptionId, // Changed from subscription_id
            lifecycle_stage: CustomerLifecycleStage.ONBOARDING, // Changed from status
            active: true,
          },
        });

        await this.database.update('users', {
          where: { user_id: newUser.user_id },
          data: {
            customer_id: newCustomer.customer_id,
            role_id: customerAdminRoleId, // Assign customer_admin role
          },
        });

        this.logger.log(
          `Created new customer ${domain} and assigned customer_admin role to user ${email}`,
        );
      }

      // Refetch user with role relation
      const userWithRole = await this.database.findUnique('users', {
        where: { user_id: newUser.user_id },
        include: {
          role: true,
          customer: true,
        },
      });

      await this.sendInviteEmail(mapUserToDto(userWithRole || newUser));
      return mapUserToDto(userWithRole || newUser);
    } catch (error) {
      // Handle duplicate key errors gracefully
      if (error.code === '23505') {
        this.logger.warn(
          `Duplicate key error for user ${supabaseUser.email} (UID: ${supabaseUser.uid}). User may already exist.`,
        );
        // Try to fetch and return the existing user
        const existingUser = await this.findByUid(supabaseUser.uid);
        if (existingUser) {
          return existingUser;
        }
      }
      this.logger.error('Create users failed:', error);
      throw error;
    }
  }

  async sendInviteEmail(user: OutputUserDto) {
    const foundUser = await this.database.findFirst('users', {
      where: { email: user.email, deleted_at: null },
    });

    if (foundUser) {
      if (
        foundUser.status === UserStatus.ACTIVE ||
        foundUser.auth_user_id ||
        foundUser.email_verified
      ) {
        throw new ConflictException('Please use forgot password flow');
      }

      // Use Admin Client to find and delete existing auth user
      try {
        const { data: authUsers } =
          await this.supabaseService.admin.listUsers();
        const existingAuthUser = authUsers?.users?.find(
          (u: any) => u.email === user.email,
        );

        if (existingAuthUser) {
          await this.supabaseService.admin.deleteUser(existingAuthUser.id);
        }
      } catch (error) {
        this.logger.debug(
          `No auth user found for email ${user.email}: ${error}`,
        );
      }
    }

    const { error } = await this.supabaseService.admin.inviteUserByEmail(
      user.email,
      {
        data: {
          ...(user?.firstName && { firstName: user.firstName }),
          ...(user?.lastName && { lastName: user.lastName }),
        },
        redirectTo: this.frontendPathsService.getSetNewPasswordUrl(),
      },
    );

    if (error) {
      this.logger.error(`Error sending invite email: ${error.message}`);
      throw new ConflictException(
        `Error sending invite email: ${error.message}`,
      );
    }

    return true;
  }

  async validateAndVoidOneTimeCode(code: string) {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const existing_code = await this.database.findFirst('user_one_time_codes', {
      where: {
        code: code,
        is_used: false,
        created_at: {
          gte: yesterday.toISOString(),
          lte: now.toISOString(),
        },
      },
    });

    if (!existing_code) {
      return false;
    }

    await this.database.update('user_one_time_codes', {
      where: { user_one_time_code_id: existing_code.user_one_time_code_id },
      data: { is_used: true },
    });

    await this.database.update('users', {
      where: { user_id: existing_code.user_id },
      data: {
        email_verified: true,
        status: UserStatus.ACTIVE,
      },
    });

    return true;
  }

  private applyOrderParams(
    orderBy: 'id' | 'email' | 'name' | 'createdAt' | undefined,
    orderDirection: string | undefined,
  ) {
    const orderByField = orderBy || 'id';
    if (!Object.values(UserOrderByFields).includes(orderByField)) {
      throw new ConflictException(
        `Invalid order by field: ${orderByField}. Allowed fields are: ${Object.values(UserOrderByFields).join(', ')}`,
      );
    }

    const applyOrderDirection: 'asc' | 'desc' =
      orderDirection === 'asc' ? 'asc' : 'desc';

    if (orderByField === 'name') {
      return [
        { field: 'full_name', direction: applyOrderDirection }, // Changed from first_name/last_name
      ];
    } else if (orderByField === 'createdAt') {
      return [{ field: 'created_at', direction: applyOrderDirection }];
    } else if (orderByField === 'id') {
      return [{ field: 'user_id', direction: applyOrderDirection }]; // Changed from id
    } else {
      return [{ field: orderByField, direction: applyOrderDirection }];
    }
  }

  getRandomString(length: number) {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async resetPassword(
    email: string,
  ): Promise<{ status: string; message: string }> {
    const user = await this.database.findFirst('users', {
      where: { email, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ConflictException(
        'User with this email is not active. Please contact support.',
      );
    }

    const { error } = await this.supabaseService.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: this.frontendPathsService.getUpdatePasswordUrl(),
      },
    );

    if (error) {
      this.logger.error(`Error sending reset password email: ${error.message}`);
      throw new ConflictException(
        `Error sending reset password email: ${error.message}`,
      );
    }

    return { status: 'ok', message: 'Password reset link sent to your email.' };
  }

  async softDelete(
    id: string,
    customerId: string | null = null,
  ): Promise<OutputUserDto> {
    const where: any = customerId
      ? { user_id: id, customer_id: customerId, deleted_at: null }
      : { user_id: id, deleted_at: null };

    const user = await this.database.findFirst('users', {
      where,
    });

    if (!user) {
      throw new NotFoundException(
        'No user with given ID exists or user is already deleted',
      );
    }

    // Get user role
    let userRole: Role | null = null;
    if (user.role_id) {
      userRole = await this.database.findUnique('roles', {
        where: { role_id: user.role_id },
      });
    }

    if (
      userRole &&
      (userRole.name === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR ||
        userRole.name === SYSTEM_ROLES.CUSTOMER_SUCCESS)
    ) {
      throw new ConflictException(
        'Not supported operation for system administrator or customer success user',
      );
    }

    if (user.customer_id) {
      const customer = await this.database.findFirst('customers', {
        where: { owner_id: user.user_id },
      });
      if (customer) {
        throw new ConflictException(
          'Cannot delete user who is a customer owner',
        );
      }
    }

    if (userRole?.name === SYSTEM_ROLES.CUSTOMER_SUCCESS) {
      // Check if user has any customer success assignments in the new table
      const csAssignments =
        await this.csOwnedCustomersService.getCustomersByCSRep(user.user_id);
      if (csAssignments && csAssignments.length > 0) {
        throw new ConflictException(
          'Cannot delete user who is a customer success manager. Please remove all customer assignments first.',
        );
      }
    }

    const deletedAt = new Date();
    const updatedUser = await this.database.update('users', {
      where: { user_id: id },
      data: {
        email: `__deleted__${user.email}`,
        deleted_at: deletedAt.toISOString(),
        status: UserStatus.SUSPENDED,
        role_id: null,
      },
    });

    // Remove user from Supabase using Admin Client
    try {
      const { data: authUsers } = await this.supabaseService.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find(
        (u: any) => u.email === user.email,
      );

      if (existingAuthUser) {
        await this.supabaseService.admin.deleteUser(existingAuthUser.id);
      }
    } catch (error) {
      this.logger.warn(
        `Could not delete auth user for ${user.email}: ${error}`,
      );
    }

    this.logger.log(`User ${id} soft deleted at ${deletedAt.toISOString()}`);

    return mapUserToDto(updatedUser);
  }

  async isUserDeleted(uid: string): Promise<boolean> {
    const count = await this.database.count('users', {
      where: { auth_user_id: uid, deleted_at: { not: null } }, // Changed from uid
    });
    return count > 0;
  }
}
