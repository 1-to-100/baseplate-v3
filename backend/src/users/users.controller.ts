import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Logger,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { ApiPaginatedResponse } from '@/common/decorators/api-paginated-response.decorator';
import { ApiConflictResponse, ApiOkResponse } from '@nestjs/swagger';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { User } from '@/common/decorators/user.decorator';
import { CustomerId } from '@/common/decorators/customer-id.decorator';
import { DynamicAuthGuard } from '@/auth/guards/dynamic-auth/dynamic-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission/permission.guard';
import { ImpersonationGuard } from '@/auth/guards/impersonation.guard';
import { UsersService } from '@/users/users.service';
import { OutputUserDto } from '@/users/dto/output-user.dto';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { InviteUserDto } from '@/users/dto/invite-user.dto';
import { ResendInviteUserDto } from '@/users/dto/resend-invite-user.dto';
import { CheckUserExistsDto } from '@/users/dto/check-user-exists.dto';
import { InviteMultipleUsersDto } from '@/users/dto/invite-multiple-users.dto';
import { ListUsersInputDto } from '@/users/dto/list-users-input.dto';
import { UpdateUserDto } from '@/users/dto/update-user.dto';
import { UserStatus } from '@/common/constants/status';
import { UserWithImpersonationDto } from '@/users/dto/user-with-impersonation.dto';
import { IsImpersonating } from '@/common/decorators/is-impersonating.decorator';
import { OriginalUser } from '@/common/decorators/original-user.decorator';
import {
  isSystemAdministrator,
  isCustomerAdministrator,
  isCustomerSuccess,
} from '@/common/utils/user-role-helpers';

@Controller('users')
@UseGuards(DynamicAuthGuard, ImpersonationGuard, PermissionGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOkResponse({
    description: 'The user record',
    type: OutputUserDto,
  })
  @ApiConflictResponse({
    description: 'Error creating user with provided data',
  })
  async create(
    @User() user: OutputUserDto,
    @Body() createUserDto: CreateUserDto,
  ) {
    if (!isSystemAdministrator(user) && !user.customerId) {
      throw new ForbiddenException('You have no access to create users.');
    }
    if (!isSystemAdministrator(user) && user.customerId) {
      // user cannot set another customer when creating users, assign the same he belongs to
      createUserDto.customerId = user.customerId;
    }

    return await this.usersService.create(createUserDto);
  }

  @Post('/invite')
  @ApiOkResponse({
    description: 'The user record',
    type: OutputUserDto,
  })
  async invite(
    @User() user: OutputUserDto,
    @Body() inviteUserDto: InviteUserDto,
  ) {
    if (!isSystemAdministrator(user) && !user.customerId) {
      throw new ForbiddenException('You have no access to invite users.');
    } else if (
      !isSystemAdministrator(user) &&
      user.customerId !== inviteUserDto.customerId
    ) {
      throw new ForbiddenException(
        'You cannot invite users for another customer.',
      );
    }

    if (!isSystemAdministrator(user) && user.customerId) {
      inviteUserDto.customerId = user.customerId;
    }

    return await this.usersService.invite(inviteUserDto);
  }

  @Post('/resend-invite')
  @ApiOkResponse({
    description: 'The user record',
    type: OutputUserDto,
  })
  async resendInvite(
    @User() user: OutputUserDto,
    @Body() resendInviteUserDto: ResendInviteUserDto,
  ) {
    if (!isSystemAdministrator(user) && !user.customerId) {
      throw new ForbiddenException('You have no access to resend invites.');
    }

    const foundUser = await this.usersService.getUserByEmail(
      resendInviteUserDto.email,
    );

    if (!foundUser) {
      throw new BadRequestException(
        `User with email ${resendInviteUserDto.email} not found.`,
      );
    } else if (foundUser && foundUser.status === UserStatus.ACTIVE) {
      throw new BadRequestException(
        `User with email ${resendInviteUserDto.email} is already active.`,
      );
    } else if (
      !isSystemAdministrator(user) &&
      foundUser &&
      foundUser.customerId !== user.customerId
    ) {
      throw new ForbiddenException(
        'You cannot resend invite for a user from another customer.',
      );
    }

    return this.usersService.resendInviteEmail(resendInviteUserDto.email);
  }

  @Post('/check-email')
  @ApiOkResponse({
    description: 'Validation result',
    type: Boolean,
  })
  async checkEmailExists(@Body() checkEmailDto: CheckUserExistsDto) {
    return await this.usersService.checkEmailExists(checkEmailDto);
  }

  @Post('/invite-multiple')
  @ApiOkResponse({
    description: 'Created users list',
    type: OutputUserDto,
    isArray: true,
  })
  async inviteMultiple(
    @User() user: OutputUserDto,
    @Body() inviteUsersDto: InviteMultipleUsersDto,
  ) {
    if (!isSystemAdministrator(user) && !user.customerId) {
      throw new ForbiddenException('You have no access to create users.');
    } else if (
      !isSystemAdministrator(user) &&
      user.customerId !== inviteUsersDto.customerId
    ) {
      throw new ForbiddenException(
        'You cannot invite users for another customer.',
      );
    }

    if (!isSystemAdministrator(user) && user.customerId) {
      // user cannot set another customer when creating users, assign the same he belongs to
      inviteUsersDto.customerId = user.customerId;
    }

    // found duplicate emails
    const seenEmails = new Set<string>();
    const duplicateEmails = inviteUsersDto.emails.filter((email) => {
      if (seenEmails.has(email)) return true;
      seenEmails.add(email);
      return false;
    });

    if (duplicateEmails.length > 0) {
      throw new BadRequestException(
        `Duplicate emails found: ${duplicateEmails.join(', ')}`,
      );
    }

    const existingEmails = await this.usersService.emailsExists(
      inviteUsersDto.emails,
    );

    if (existingEmails.length > 0) {
      throw new BadRequestException(
        `The following emails already exist: ${existingEmails.join(', ')}`,
      );
    }

    const invitePromises = inviteUsersDto.emails.map(async (email) => {
      const inviteUserDto = new InviteUserDto();
      inviteUserDto.email = email;
      inviteUserDto.customerId = inviteUsersDto.customerId;
      inviteUserDto.roleId = inviteUsersDto.roleId;
      inviteUserDto.managerId = inviteUsersDto.managerId;
      return this.usersService.invite(inviteUserDto);
    });

    const results = await Promise.all(invitePromises);
    // Filter out null results as we don't care about failed/skipped invites. Or care?
    return results.filter((result) => result !== null);
  }

  @Get()
  @ApiPaginatedResponse(OutputUserDto)
  @ApiOkResponse({
    description: 'Created users list',
    type: PaginatedOutputDto,
    isArray: true,
  })
  findAll(
    @User() user: OutputUserDto,
    @Query() listUserInputDto: ListUsersInputDto,
    @CustomerId() customerId?: string,
  ) {
    this.logger.debug(listUserInputDto);

    // Users without a role (role_id: null) shouldn't have access to this endpoint at all
    if (!user.role) {
      throw new ForbiddenException('You have no access to list users.');
    }

    // System administrators have access to all users
    if (isSystemAdministrator(user)) {
      // System administrators can access any customer's users
      if (customerId) {
        listUserInputDto.customerId = [customerId];
      }
      return this.usersService.findAll(listUserInputDto);
    }

    // Customer success and customer administrator can have access to all users for their customerId
    if (isCustomerSuccess(user) || isCustomerAdministrator(user)) {
      if (!user.customerId) {
        throw new ForbiddenException('You have no access to list users.');
      }

      // Force the query to only include users from their customer
      listUserInputDto.customerId = [user.customerId];

      // If a specific customerId is provided in the query, validate it matches their customer
      if (customerId && customerId !== user.customerId) {
        throw new ForbiddenException(
          'You can only access users from your own customer.',
        );
      }

      return this.usersService.findAll(listUserInputDto);
    }

    // All other users (including those with custom roles) don't have access
    throw new ForbiddenException('You have no access to list users.');
  }

  @Get('/me')
  @ApiOkResponse({
    description:
      'User profile. If impersonating, includes impersonation information',
    type: UserWithImpersonationDto,
  })
  @ApiOkResponse({
    description: 'User profile with impersonation info',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/UserWithImpersonationDto' },
        {
          example: {
            id: 1,
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            isImpersonating: true,
            impersonatedBy: {
              id: 2,
              email: 'admin@example.com',
              firstName: 'Admin',
              lastName: 'User',
            },
          },
        },
      ],
    },
  })
  async findSelf(
    @User() user: OutputUserDto,
    @IsImpersonating() isImpersonating: boolean,
    @OriginalUser() originalUser: OutputUserDto,
  ) {
    const userData = await this.usersService.findOne(user.id);

    if (isImpersonating && originalUser) {
      const response: UserWithImpersonationDto = {
        ...userData,
        isImpersonating: true,
        impersonatedBy: {
          id: originalUser.id,
          email: originalUser.email,
          firstName: originalUser.firstName,
          lastName: originalUser.lastName,
        },
      };

      return response;
    }

    return userData;
  }

  @Patch('/me')
  @ApiOkResponse({
    description: 'User',
    type: OutputUserDto,
  })
  async updateSelf(
    @User() user: OutputUserDto,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    updateUserDto.customerId = user.customerId!; // do not allow to change customer
    return this.usersService.update(user.id, updateUserDto, user);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'User',
    type: OutputUserDto,
  })
  findOne(@User() user: OutputUserDto, @Param('id') id: string) {
    let customerId: string | null = null;
    if (!isSystemAdministrator(user)) {
      customerId = user.customerId;
    }

    return this.usersService.findOne(id, customerId);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'User',
    type: OutputUserDto,
  })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: OutputUserDto,
  ) {
    if (!isSystemAdministrator(user) && !user.customerId) {
      throw new ForbiddenException('You have no access to update users.');
    }
    if (!isSystemAdministrator(user) && user.customerId) {
      // user cannot set another customer when updating users, assign the same he belongs to
      updateUserDto.customerId = user.customerId;
    }

    return this.usersService.update(id, updateUserDto, user);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'User soft deleted',
    type: OutputUserDto,
  })
  async softDelete(@Param('id') id: string, @User() user: OutputUserDto) {
    if (user.id === id) {
      throw new BadRequestException('You cannot delete yourself.');
    }

    if (!isSystemAdministrator(user) && !user.customerId) {
      throw new ForbiddenException('You have no access to delete users.');
    }

    const customerId = isSystemAdministrator(user) ? null : user.customerId;

    return await this.usersService.softDelete(id, customerId);
  }
}
