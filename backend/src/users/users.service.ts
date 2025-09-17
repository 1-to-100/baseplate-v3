import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { createPaginator } from 'prisma-pagination';
import { CustomerStatus, Prisma } from '@prisma/client';
import { getDomainFromEmail } from '@/common/helpers/string-helpers';
import { UserSystemRoles } from '@/common/constants/user-system-roles';
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

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
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

    let user: OutputUserDto | null = null;

    try {
      this.logger.log(`Create user with email ${createUserDto.email}`);
      user = await this.prisma.user.create({ data: createUserDto });
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
      await this.sendInviteEmail(user);
    }

    return user;
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
      const customer = await this.prisma.customer.findUnique({
        where: { id: createSystemUserDto.customerId },
      });
      if (!customer) {
        throw new ConflictException('Customer not found');
      }
    }

    let user: OutputUserDto | null = null;

    try {
      user = await this.prisma.user.create({
        data: { ...makeUser, isSuperadmin, isCustomerSuccess },
      });

      // attach customer success to customer
      if (isCustomerSuccess && createSystemUserDto.customerId) {
        await this.prisma.customer.update({
          where: { id: createSystemUserDto.customerId },
          data: { customerSuccessId: user.id },
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
      await this.sendInviteEmail(user);
    }

    return user;
  }

  async invite(inviteUserDto: InviteUserDto): Promise<OutputUserDto> {
    if (await this.emailExists({ email: inviteUserDto.email })) {
      throw new ConflictException('User with this email already exists');
    }

    if (inviteUserDto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: inviteUserDto.customerId },
      });
      if (!customer) {
        throw new ConflictException('Customer not found');
      }
    }

    const user = await this.prisma.user.create({ data: inviteUserDto });
    await this.sendInviteEmail(user);
    return user;
  }

  async getUserByEmail(email: string): Promise<OutputUserDto | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async resendInviteEmail(email: string): Promise<OutputUserDto> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    } else if (user.status === UserStatus.ACTIVE) {
      throw new ConflictException('User is already active');
    }

    await this.sendInviteEmail(user);
    return user;
  }

  async checkEmailExists(checkUserExistsDto: CheckUserExistsDto) {
    return {
      exists: await this.emailExists(checkUserExistsDto),
    };
  }

  async emailExists(checkUserExistsDto: CheckUserExistsDto) {
    return !!(await this.prisma.user.findFirst({
      where: { email: checkUserExistsDto.email },
    }));
  }

  async emailsExists(emails: string[]): Promise<string[]> {
    const existingEmails = await this.prisma.user.findMany({
      select: { email: true },
      where: {
        deletedAt: null,
        email: {
          in: emails,
        },
      },
    });

    return existingEmails.map((user) => user.email);
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
    const where: Prisma.UserFindManyArgs['where'] = {
      ...(roleId && { roleId: { in: roleId } }),
      ...(customerId && { customerId: { in: customerId } }),
      ...(hasCustomer == true
        ? { customerId: { not: null } }
        : hasCustomer == false
          ? { customerId: null }
          : {}),
      ...(status && { status: { in: status } }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...{
        AND: [{ isSuperadmin: false }, { isCustomerSuccess: false }],
      },
      deletedAt: null,
    };
    const applyOrderByField = this.applyOrderParams(orderBy, orderDirection);
    const paginate = createPaginator({ perPage });
    return paginate<OutputUserDto, Prisma.UserFindManyArgs>(
      this.prisma.user,
      {
        where,
        orderBy: applyOrderByField,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
        },
      },
      { page },
    );
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
    const where: Prisma.UserFindManyArgs['where'] = {
      ...(roleId && { roleId: { in: roleId } }),
      ...(customerId && { customerId: { in: customerId } }),
      ...(status && { status: { in: status } }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...{ AND: { OR: [{ isSuperadmin: true }, { isCustomerSuccess: true }] } },
      deletedAt: null,
    };

    const applyOrderByField = this.applyOrderParams(orderBy, orderDirection);
    const paginate = createPaginator({ perPage });
    return paginate<OutputUserDto, Prisma.UserFindManyArgs>(
      this.prisma.user,
      {
        where,
        orderBy: applyOrderByField,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
        },
      },
      { page },
    );
  }

  async findOne(
    id: number,
    customerId: number | null = null,
  ): Promise<OutputUserDto> {
    const where = customerId
      ? { AND: [{ id }, { customerId }, { deletedAt: null }] }
      : { AND: [{ id }, { deletedAt: null }] };
    const user = await this.prisma.user.findFirst({
      where,
      include: {
        role: true,
        customer: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        manager: true,
      },
    });

    if (!user) {
      throw new NotFoundException('No user with given ID exists');
    }

    let userPermissions: string[] = [];
    if (user.role) {
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: { roleId: user.role.id },
        include: {
          permission: true,
        },
      });

      userPermissions = rolePermissions
        ? rolePermissions.map(
            (permission) => permission.permission.name.split(':')[1],
          )
        : [];
    }

    return { ...user, permissions: userPermissions } as OutputUserDto;
  }

  async findOneSystemUser(id: number): Promise<OutputUserDto> {
    const where: Prisma.UserFindManyArgs['where'] = {
      id,
      ...{
        OR: [{ isSuperadmin: true }, { isCustomerSuccess: true }],
      },
      deletedAt: null,
    };

    const user = await this.prisma.user.findFirst({
      where: where,
      include: {
        role: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: true,
      },
    });
    if (!user) {
      throw new NotFoundException('No user with given ID exists');
    }

    return user as OutputUserDto;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    updatedBy?: OutputUserDto,
  ): Promise<OutputUserDto> {
    if (updateUserDto.email) {
      updateUserDto.email = undefined;
    }
    const existingUser = await this.prisma.user.findFirst({
      where: { id, customerId: updateUserDto.customerId, deletedAt: null },
    });

    if (!existingUser) {
      throw new NotFoundException('No user with given ID exists');
    }

    if (updatedBy && updateUserDto.status) {
      if (updatedBy.id === id) {
        throw new ConflictException('You cannot change your own status');
      } else if (existingUser.isSuperadmin || existingUser.isCustomerSuccess) {
        throw new ConflictException(
          'You cannot change status of superadmin or customer success user',
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

    const user = await this.prisma.user.update({
      where: { id, customerId: updateUserDto.customerId },
      data: updateUserDto,
    });

    return user;
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
        const customer = await this.prisma.customer.findUnique({
          where: { id: updateSystemUserDto.customerId },
        });
        if (!customer) {
          throw new ConflictException('Customer not found');
        }
      }
    }

    const user = await this.prisma.user.update({
      where: { id, deletedAt: null },
      data: {
        ...updateUser,
        ...(systemRole ? { isSuperadmin, isCustomerSuccess } : {}),
        ...(isSuperadmin ? { customerId: null } : {}),
      },
    });

    // attach customer success to customer
    if (isSuperadmin) {
      await this.prisma.customer.updateMany({
        where: { customerSuccessId: id },
        data: { customerSuccessId: null },
      });
    } else if (isCustomerSuccess && updateSystemUserDto.customerId) {
      await this.prisma.customer.update({
        where: { id: updateSystemUserDto.customerId },
        data: { customerSuccessId: user.id },
      });
    }

    return user;
  }

  async findByUid(uid: string) {
    return this.prisma.user.findUnique({
      where: {
        uid,
      },
    });
  }

  async createSupabaseUser(
    supabaseUser: SupabaseDecodedToken,
    subscriptionId: number | null = null,
  ) {
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

    const existingUserEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (
      existingUserEmail &&
      existingUserEmail.uid == null &&
      supabaseUser.uid
    ) {
      const existingUserEmailUpdated = await this.prisma.user.update({
        where: { id: existingUserEmail.id },
        data: {
          uid: supabaseUser.uid,
          status: UserStatus.ACTIVE,
          firstName,
          lastName,
        },
      });
      return existingUserEmailUpdated;
    }

    const existingCustomer = await this.prisma.customer.findFirst({
      where: { domain },
    });

    const [newUser] = await Promise.all([
      this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          avatar: supabaseUser.picture,
          uid: supabaseUser.uid,
          status: supabaseUser.uid ? UserStatus.ACTIVE : UserStatus.INACTIVE,
          customerId: existingCustomer?.id,
        },
      }),
    ]);

    if (!existingCustomer) {
      const newCustomer = await this.prisma.customer.create({
        data: {
          name: domain,
          email,
          domain,
          ownerId: newUser.id,
          subscriptionId,
        },
      });

      await this.prisma.user.update({
        where: { id: newUser.id },
        data: { customerId: newCustomer.id },
      });
    }

    await this.sendInviteEmail(newUser);
    return newUser;
  }

  async sendInviteEmail(user: OutputUserDto) {
    const foundUser = await this.prisma.user.findFirst({
      where: { email: user.email, deletedAt: null },
    });

    if (foundUser) {
      if (
        foundUser.status === UserStatus.ACTIVE ||
        foundUser.uid ||
        foundUser.emailVerified
      ) {
        throw new ConflictException('Please use forgot password flow');
      }

      const rawQueryResult = await this.prisma.$queryRaw<
        { id: string | null }[]
      >`SELECT * FROM auth.users WHERE email = ${user.email};`;

      if (rawQueryResult?.length) {
        const supabaseUserId = rawQueryResult[0]?.id;
        if (supabaseUserId) {
          await this.supabaseService.admin.deleteUser(supabaseUserId);
        }
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

    const existing_code = await this.prisma.userOneTimeCodes.findFirst({
      where: {
        code: code,
        isUsed: false,
        createdAt: {
          gte: yesterday,
          lte: now,
        },
      },
    });
    if (!existing_code) {
      return false;
    }
    existing_code.isUsed = true;
    const id = existing_code.id;
    await this.prisma.userOneTimeCodes.update({
      where: { id },
      data: existing_code,
    });
    await this.prisma.user.update({
      where: { id: existing_code.userId },
      data: {
        emailVerified: true,
        status: CustomerStatus.active,
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

    const applyOrderDirection = orderDirection
      ? (orderDirection as Prisma.SortOrder)
      : 'desc';

    const applyOrderByField: Prisma.UserFindManyArgs['orderBy'] =
      orderByField === 'name'
        ? [
            { firstName: applyOrderDirection },
            { lastName: applyOrderDirection },
          ]
        : { [orderByField]: applyOrderDirection };
    return applyOrderByField;
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
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
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
    const where = customerId
      ? { AND: [{ id }, { customerId }, { deletedAt: null }] }
      : { AND: [{ id }, { deletedAt: null }] };

    const user = await this.prisma.user.findFirst({
      where,
    });

    if (!user) {
      throw new NotFoundException(
        'No user with given ID exists or user is already deleted',
      );
    } else if (user && (user.isSuperadmin || user.isCustomerSuccess)) {
      throw new ConflictException(
        'Not supported operation for superadmin or customer success user',
      );
    }

    if (user.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { ownerId: user.id },
      });
      if (customer) {
        throw new ConflictException(
          'Cannot delete user who is a customer owner',
        );
      }
    }

    if (user.isCustomerSuccess) {
      const customerWithSuccess = await this.prisma.customer.findFirst({
        where: { customerSuccessId: user.id },
      });
      if (customerWithSuccess) {
        throw new ConflictException(
          'Cannot delete user who is a customer success manager',
        );
      }
    }

    const deletedAt = new Date();
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        email: `__deleted__${user.email}`,
        deletedAt: deletedAt,
        status: UserStatus.SUSPENDED,
        emailVerified: false,
        roleId: null,
      },
    });

    // Remove user from Supabase
    const rawQueryResult = await this.prisma.$queryRaw<
      { id: string | null }[]
    >`SELECT * FROM auth.users WHERE email = ${user.email};`;

    if (rawQueryResult?.length) {
      const supabaseUserId = rawQueryResult[0]?.id;
      if (supabaseUserId) {
        await this.supabaseService.admin.deleteUser(supabaseUserId);
      }
    }

    this.logger.log(`User ${id} soft deleted at ${deletedAt.toISOString()}`);

    return updatedUser;
  }

  async isUserDeleted(uid: string): Promise<boolean> {
    const deletedUserCount = await this.prisma.user.count({
      where: { uid, deletedAt: { not: null } },
    });
    return deletedUserCount > 0;
  }
}
