import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { getDomainFromEmail } from '@/common/helpers/string-helpers';
import { UserSystemRoles } from '@/common/constants/user-system-roles';
import { SYSTEM_ROLE_IDS } from '@/common/constants/system-roles';
import { UserOrderByFields, UserStatus } from '@/common/constants/status';
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
import type { User, Customer, CustomerStatus } from '@/common/types';

// Helper to convert database User to OutputUserDto with proper type handling
function mapUserToDto(user: any): OutputUserDto {
  if (!user) return user;

  return {
    id: user.id,
    uid: user.uid,
    email: user.email,
    emailVerified: user.email_verified,
    firstName: user.first_name,
    lastName: user.last_name,
    avatar: user.avatar,
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
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        systemRole: user.role.system_role,
      },
    }),
    ...(user.roles && {
      role: {
        id: user.roles.id,
        name: user.roles.name,
        description: user.roles.description,
        systemRole: user.roles.system_role,
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
  ) {}

  async create(
    createUserDto: CreateUserDto,
    skipInvite: boolean = false,
  ): Promise<OutputUserDto> {
    if (await this.emailExists({ email: createUserDto.email })) {
      throw new ConflictException('User with this email already exists');
    }

    let user: User | null = null;

    try {
      this.logger.log(`Create user with email ${createUserDto.email}`);

      // Convert camelCase DTO fields to snake_case database fields
      const userData = {
        email: createUserDto.email,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone_number: createUserDto.phoneNumber,
        customer_id: createUserDto.customerId,
        role_id: createUserDto.roleId,
        manager_id: createUserDto.managerId,
        status: createUserDto.status || 'inactive',
      };

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

    if (isCustomerSuccess && !createSystemUserDto.customerId) {
      throw new ConflictException(
        'Customer ID is required for Customer Success role',
      );
    } else if (isCustomerSuccess && createSystemUserDto.customerId) {
      const customer = await this.database.findUnique('customers', {
        where: { id: createSystemUserDto.customerId },
      });
      if (!customer) {
        throw new ConflictException('Customer not found');
      }
    }

    // Determine role_id based on system role
    const roleId = isSuperadmin
      ? SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR
      : SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS;

    let user: User | null = null;

    try {
      // Convert camelCase DTO fields to snake_case database fields
      const userData = {
        email: makeUser.email,
        first_name: makeUser.firstName,
        last_name: makeUser.lastName,
        phone_number: makeUser.phoneNumber,
        customer_id: makeUser.customerId,
        role_id: roleId,
        manager_id: makeUser.managerId,
        status: makeUser.status || 'inactive',
      };

      user = await this.database.create('users', {
        data: userData,
      });

      // attach customer success to customer
      if (isCustomerSuccess && createSystemUserDto.customerId) {
        await this.database.update('customers', {
          where: { id: createSystemUserDto.customerId },
          data: { customer_success_id: user.id },
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
        where: { id: inviteUserDto.customerId },
      });
      if (!customer) {
        throw new ConflictException('Customer not found');
      }
    }

    // Convert camelCase DTO fields to snake_case database fields
    const userData = {
      email: inviteUserDto.email,
      customer_id: inviteUserDto.customerId,
      role_id: inviteUserDto.roleId,
      manager_id: inviteUserDto.managerId,
      status: 'inactive',
    };

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

    // Build where conditions using snake_case
    const where: any = {
      ...(roleId && { role_id: { in: roleId } }),
      ...(customerId && { customer_id: { in: customerId } }),
      ...(hasCustomer === true
        ? { customer_id: { not: null } }
        : hasCustomer === false
          ? { customer_id: null }
          : {}),
      ...(status && { status: { in: status } }),
      ...(search && {
        OR: [
          { first_name: { contains: search } },
          { last_name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      // Exclude system roles using AND with not conditions
      AND: [
        { role_id: { not: SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR } },
        { role_id: { not: SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS } },
      ],
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
          customers!customer_id(id, name, owner_id)
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
          { first_name: { contains: search } },
          { last_name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      // Include only system roles (System Administrator and Customer Success)
      role_id: {
        in: [
          SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR,
          SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS,
        ],
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
          customers!customer_id(id, name, owner_id)
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
    id: number,
    customerId: number | null = null,
  ): Promise<OutputUserDto> {
    const where: any = customerId
      ? { id, customer_id: customerId, deleted_at: null }
      : { id, deleted_at: null };

    const user = await this.database.findFirst('users', {
      where,
      select: `
        *,
        roles!role_id(*),
        customers!customer_id(id, name, owner_id),
        managers!manager_id(*)
      `,
    });

    if (!user) {
      throw new NotFoundException('No user with given ID exists');
    }

    let userPermissions: string[] = [];
    if (user.role_id) {
      const rolePermissions = await this.database.findMany('role_permissions', {
        where: { role_id: user.role_id },
        select: `
          *,
          permissions!permission_id(name)
        `,
      });

      userPermissions = rolePermissions
        ? rolePermissions
            .map((rp: any) => rp.permissions?.name?.split(':')[1] || '')
            .filter(Boolean)
        : [];
    }

    return mapUserToDto({ ...user, permissions: userPermissions });
  }

  async findOneSystemUser(id: number): Promise<OutputUserDto> {
    const where: any = {
      id,
      role_id: {
        in: [
          SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR,
          SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS,
        ],
      },
      deleted_at: null,
    };

    const user = await this.database.findFirst('users', {
      where,
      select: `
        *,
        roles!role_id(*),
        customers!customer_id(id, name),
        managers!manager_id(*)
      `,
    });

    if (!user) {
      throw new NotFoundException('No user with given ID exists');
    }

    return mapUserToDto(user);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    updatedBy?: OutputUserDto,
  ): Promise<OutputUserDto> {
    if (updateUserDto.email) {
      updateUserDto.email = undefined;
    }

    const whereClause: any = { id, deleted_at: null };
    if (updateUserDto.customerId) {
      whereClause.customer_id = updateUserDto.customerId;
    }
    const existingUser = await this.database.findFirst('users', {
      where: whereClause,
    });

    if (!existingUser) {
      throw new NotFoundException('No user with given ID exists');
    }

    if (updatedBy && updateUserDto.status) {
      if (updatedBy.id === id) {
        throw new ConflictException('You cannot change your own status');
      } else if (
        existingUser.role_id === SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR ||
        existingUser.role_id === SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS
      ) {
        throw new ConflictException(
          'You cannot change status of system administrator or customer success user',
        );
      } else if (!existingUser.uid) {
        throw new ConflictException(
          'You cannot change status of user without Supabase UID',
        );
      }

      if (
        updateUserDto.status === UserStatus.SUSPENDED &&
        existingUser.status == UserStatus.ACTIVE
      ) {
        await this.supabaseService.banUser(existingUser.uid);
      } else if (
        updateUserDto.status === UserStatus.ACTIVE &&
        existingUser.status == UserStatus.SUSPENDED
      ) {
        await this.supabaseService.unbanUser(existingUser.uid);
      }
    }

    const updateWhereClause: any = { id };
    if (updateUserDto.customerId) {
      updateWhereClause.customer_id = updateUserDto.customerId;
    }

    // Convert camelCase DTO fields to snake_case database fields
    const updateData: any = {};
    if (updateUserDto.email !== undefined)
      updateData.email = updateUserDto.email;
    if (updateUserDto.firstName !== undefined)
      updateData.first_name = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined)
      updateData.last_name = updateUserDto.lastName;
    if (updateUserDto.phoneNumber !== undefined)
      updateData.phone_number = updateUserDto.phoneNumber;
    if (updateUserDto.customerId !== undefined)
      updateData.customer_id = updateUserDto.customerId;
    if (updateUserDto.roleId !== undefined)
      updateData.role_id = updateUserDto.roleId;
    if (updateUserDto.managerId !== undefined)
      updateData.manager_id = updateUserDto.managerId;
    if (updateUserDto.status !== undefined)
      updateData.status = updateUserDto.status;

    const user = await this.database.update('users', {
      where: updateWhereClause,
      data: updateData,
    });

    return mapUserToDto(user);
  }

  async updateSystemUser(
    id: number,
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
          where: { id: updateSystemUserDto.customerId },
        });
        if (!customer) {
          throw new ConflictException('Customer not found');
        }
      }
    }

    // Convert camelCase DTO fields to snake_case database fields
    const updateData: any = {};
    if (updateUser.firstName !== undefined)
      updateData.first_name = updateUser.firstName;
    if (updateUser.lastName !== undefined)
      updateData.last_name = updateUser.lastName;
    if (updateUser.phoneNumber !== undefined)
      updateData.phone_number = updateUser.phoneNumber;
    if (updateUser.customerId !== undefined)
      updateData.customer_id = updateUser.customerId;
    if (updateUser.roleId !== undefined) updateData.role_id = updateUser.roleId;
    if (updateUser.managerId !== undefined)
      updateData.manager_id = updateUser.managerId;
    if (updateUser.status !== undefined) updateData.status = updateUser.status;

    // Update role_id based on system role
    if (systemRole) {
      updateData.role_id = isSuperadmin
        ? SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR
        : SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS;
    }

    // Clear customer_id for superadmin
    if (isSuperadmin) {
      updateData.customer_id = null;
    }

    const user = await this.database.update('users', {
      where: { id, deleted_at: null },
      data: updateData,
    });

    // attach customer success to customer
    if (isSuperadmin) {
      await this.database.updateMany('customers', {
        where: { customer_success_id: id },
        data: { customer_success_id: null },
      });
    } else if (isCustomerSuccess && updateSystemUserDto.customerId) {
      await this.database.update('customers', {
        where: { id: updateSystemUserDto.customerId },
        data: { customer_success_id: user.id },
      });
    }

    return mapUserToDto(user);
  }

  async findByUid(uid: string): Promise<OutputUserDto | null> {
    const user = await this.database.findUnique('users', {
      where: { uid },
      include: {
        role: true,
        customer: true,
      },
    });
    return user ? mapUserToDto(user) : null;
  }

  async createSupabaseUser(
    supabaseUser: SupabaseDecodedToken,
    subscriptionId: number | null = null,
  ): Promise<OutputUserDto> {
    const existingUser = await this.findByUid(supabaseUser.uid);
    if (existingUser) {
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
      existingUserEmail.uid == null &&
      supabaseUser.uid
    ) {
      await this.database.update('users', {
        where: { id: existingUserEmail.id },
        data: {
          uid: supabaseUser.uid,
          status: UserStatus.ACTIVE,
          first_name: firstName,
          last_name: lastName,
        },
      });

      // Refetch user with role relation
      const existingUserEmailUpdated = await this.database.findUnique('users', {
        where: { id: existingUserEmail.id },
        include: {
          role: true,
          customer: true,
        },
      });

      return mapUserToDto(existingUserEmailUpdated!);
    }

    const existingCustomer = await this.database.findFirst('customers', {
      where: { domain },
    });

    const [newUser] = await Promise.all([
      this.database.create('users', {
        data: {
          email,
          first_name: firstName,
          last_name: lastName,
          avatar: supabaseUser.picture,
          uid: supabaseUser.uid,
          status: supabaseUser.uid ? UserStatus.ACTIVE : UserStatus.INACTIVE,
          customer_id: existingCustomer?.id,
        } as Partial<User>,
      }),
    ]);

    if (!existingCustomer) {
      const newCustomer = await this.database.create('customers', {
        data: {
          name: domain,
          email,
          domain,
          owner_id: newUser.id,
          subscription_id: subscriptionId,
        } as Partial<Customer>,
      });

      await this.database.update('users', {
        where: { id: newUser.id },
        data: { customer_id: newCustomer.id },
      });
    }

    // Refetch user with role relation
    const userWithRole = await this.database.findUnique('users', {
      where: { id: newUser.id },
      include: {
        role: true,
        customer: true,
      },
    });

    await this.sendInviteEmail(mapUserToDto(userWithRole || newUser));
    return mapUserToDto(userWithRole || newUser);
  }

  async sendInviteEmail(user: OutputUserDto) {
    const foundUser = await this.database.findFirst('users', {
      where: { email: user.email, deleted_at: null },
    });

    if (foundUser) {
      if (
        foundUser.status === UserStatus.ACTIVE ||
        foundUser.uid ||
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

    const id = existing_code.id;
    await this.database.update('user_one_time_codes', {
      where: { id },
      data: { is_used: true },
    });

    await this.database.update('users', {
      where: { id: existing_code.user_id },
      data: {
        email_verified: true,
        status: 'active' as CustomerStatus,
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
        { field: 'first_name', direction: applyOrderDirection },
        { field: 'last_name', direction: applyOrderDirection },
      ];
    } else if (orderByField === 'createdAt') {
      return [{ field: 'created_at', direction: applyOrderDirection }];
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
    id: number,
    customerId: number | null = null,
  ): Promise<OutputUserDto> {
    const where: any = customerId
      ? { id, customer_id: customerId, deleted_at: null }
      : { id, deleted_at: null };

    const user = await this.database.findFirst('users', {
      where,
    });

    if (!user) {
      throw new NotFoundException(
        'No user with given ID exists or user is already deleted',
      );
    } else if (
      user &&
      (user.role_id === SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR ||
        user.role_id === SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS)
    ) {
      throw new ConflictException(
        'Not supported operation for system administrator or customer success user',
      );
    }

    if (user.customer_id) {
      const customer = await this.database.findFirst('customers', {
        where: { owner_id: user.id },
      });
      if (customer) {
        throw new ConflictException(
          'Cannot delete user who is a customer owner',
        );
      }
    }

    if (user.role_id === SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS) {
      const customerWithSuccess = await this.database.findFirst('customers', {
        where: { customer_success_id: user.id },
      });
      if (customerWithSuccess) {
        throw new ConflictException(
          'Cannot delete user who is a customer success manager',
        );
      }
    }

    const deletedAt = new Date();
    const updatedUser = await this.database.update('users', {
      where: { id },
      data: {
        email: `__deleted__${user.email}`,
        deleted_at: deletedAt.toISOString(),
        status: UserStatus.SUSPENDED,
        email_verified: false,
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
      where: { uid, deleted_at: { not: null } },
    });
    return count > 0;
  }
}
