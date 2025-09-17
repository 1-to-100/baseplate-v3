import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { FrontendPathsService } from '@/common/helpers/frontend-paths.service';
import { CustomerStatus } from '@prisma/client';
import { UserSystemRoles } from '@/common/constants/user-system-roles';
import { UserStatus } from '@/common/constants/status';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;
  let supabaseService: jest.Mocked<SupabaseService>;
  let frontendPathsService: jest.Mocked<FrontendPathsService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    status: UserStatus.ACTIVE,
    customerId: 1,
    isSuperadmin: false,
    isCustomerSuccess: false,
    uid: 'test-uid',
    emailVerified: true,
    avatar: null,
    roleId: null,
    managerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCustomer = {
    id: 1,
    name: 'Test Customer',
    email: 'test@example.com',
    domain: 'example.com',
    ownerId: 1,
    customerSuccessId: null,
    subscriptionId: null,
    status: CustomerStatus.active,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        $queryRaw: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn(),
      },
      userOneTimeCodes: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const mockSupabaseService = {
      admin: {
        inviteUserByEmail: jest.fn(),
        deleteUser: jest.fn(),
      },
      auth: {
        resetPasswordForEmail: jest.fn(),
      },
    };

    const mockFrontendPathsService = {
      getSetNewPasswordUrl: jest.fn(),
      getUpdatePasswordUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: FrontendPathsService,
          useValue: mockFrontendPathsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
    supabaseService = module.get(SupabaseService);
    frontendPathsService = module.get(FrontendPathsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      customerId: 1,
    };

    it('should create a user successfully', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);
      (supabaseService.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
        error: null,
      });
      (frontendPathsService.getSetNewPasswordUrl as jest.Mock).mockReturnValue(
        'http://localhost:3000/set-password',
      );

      const result = await service.create(createUserDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: createUserDto,
      });
      expect(supabaseService.admin.inviteUserByEmail).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should create user without sending invite when skipInvite is true', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.create(createUserDto, true);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: createUserDto,
      });
      expect(supabaseService.admin.inviteUserByEmail).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should handle database errors during user creation', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('createSystemUser', () => {
    const createSystemUserDto = {
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      systemRole: UserSystemRoles.SYSTEM_ADMIN,
    };

    it('should create a system admin user successfully', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        isSuperadmin: true,
      });
      (supabaseService.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
        error: null,
      });
      (frontendPathsService.getSetNewPasswordUrl as jest.Mock).mockReturnValue(
        'http://localhost:3000/set-password',
      );

      const result = await service.createSystemUser(createSystemUserDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          isSuperadmin: true,
          isCustomerSuccess: false,
        },
      });
      expect(result.isSuperadmin).toBe(true);
    });

    it('should create a customer success user with customer ID', async () => {
      const customerSuccessDto = {
        ...createSystemUserDto,
        systemRole: UserSystemRoles.CUSTOMER_SUCCESS,
        customerId: 1,
      };

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        isCustomerSuccess: true,
      });
      (prismaService.customer.update as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (supabaseService.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
        error: null,
      });
      (frontendPathsService.getSetNewPasswordUrl as jest.Mock).mockReturnValue(
        'http://localhost:3000/set-password',
      );

      const result = await service.createSystemUser(customerSuccessDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          isSuperadmin: false,
          isCustomerSuccess: true,
          customerId: 1,
        },
      });
      expect(prismaService.customer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { customerSuccessId: result.id },
      });
    });

    it('should throw ConflictException for invalid system role', async () => {
      const invalidDto = {
        ...createSystemUserDto,
        systemRole: 'INVALID_ROLE' as any,
      };

      await expect(service.createSystemUser(invalidDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if customer not found for customer success role', async () => {
      const customerSuccessDto = {
        ...createSystemUserDto,
        systemRole: UserSystemRoles.CUSTOMER_SUCCESS,
        customerId: 999,
      };

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createSystemUser(customerSuccessDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateSystemUser', () => {
    const updateSystemUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      systemRole: UserSystemRoles.SYSTEM_ADMIN,
    };

    it('should update a system user successfully', async () => {
      const existingUser = { ...mockUser, isSuperadmin: true };
      const updatedUser = {
        ...existingUser,
        firstName: 'Updated',
        lastName: 'Name',
      };

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        existingUser,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (prismaService.customer.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await service.updateSystemUser(1, updateSystemUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        data: {
          firstName: 'Updated',
          lastName: 'Name',
          isSuperadmin: true,
          isCustomerSuccess: false,
          customerId: null,
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateSystemUser(999, updateSystemUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user tries to change their own status', async () => {
      const updateUserDtoWithStatus = {
        ...updateSystemUserDto,
        status: UserStatus.SUSPENDED,
      };
      const existingUser = { ...mockUser, isSuperadmin: true };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        existingUser,
      );

      await expect(
        service.updateSystemUser(
          existingUser.id,
          updateUserDtoWithStatus,
          existingUser,
        ),
      ).rejects.toThrow('You cannot change your own status');
    });
  });

  describe('invite', () => {
    const inviteUserDto = {
      email: 'invite@example.com',
      customerId: 1,
      roleId: 1,
    };

    it('should invite a user successfully', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);
      (supabaseService.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
        error: null,
      });
      (frontendPathsService.getSetNewPasswordUrl as jest.Mock).mockReturnValue(
        'http://localhost:3000/set-password',
      );

      const result = await service.invite(inviteUserDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: inviteUserDto,
      });
      expect(supabaseService.admin.inviteUserByEmail).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if customer not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.invite(inviteUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('resendInviteEmail', () => {
    it('should resend invite email successfully', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        uid: null,
        emailVerified: false,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        inactiveUser,
      );
      (supabaseService.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
        error: null,
      });
      (frontendPathsService.getSetNewPasswordUrl as jest.Mock).mockReturnValue(
        'http://localhost:3000/set-password',
      );
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.resendInviteEmail('test@example.com');

      expect(supabaseService.admin.inviteUserByEmail).toHaveBeenCalled();
      expect(result).toEqual(inactiveUser);
    });

    it('should throw ConflictException if user is already active', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.resendInviteEmail('test@example.com'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('checkEmailExists', () => {
    it('should return exists: true when email exists', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.checkEmailExists({
        email: 'test@example.com',
      });

      expect(result).toEqual({ exists: true });
    });

    it('should return exists: false when email does not exist', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.checkEmailExists({
        email: 'nonexistent@example.com',
      });

      expect(result).toEqual({ exists: false });
    });
  });

  describe('emailsExists', () => {
    it('should return array of existing emails', async () => {
      const existingUsers = [
        { email: 'test1@example.com' },
        { email: 'test2@example.com' },
      ];
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(
        existingUsers,
      );

      const result = await service.emailsExists([
        'test1@example.com',
        'test2@example.com',
        'test3@example.com',
      ]);

      expect(result).toEqual(['test1@example.com', 'test2@example.com']);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockPaginatedResult = {
        data: [mockUser],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };
      // Мокаємо createPaginator через spyOn
      const { createPaginator } = require('prisma-pagination');
      jest
        .spyOn(require('prisma-pagination'), 'createPaginator')
        .mockReturnValue(() => Promise.resolve(mockPaginatedResult));
      const listUsersInput = {
        page: 1,
        perPage: 10,
        orderBy: 'id' as const,
        orderDirection: 'desc',
      };
      const result = await service.findAll(listUsersInput);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return user with permissions', async () => {
      const userWithRole = {
        ...mockUser,
        role: { id: 1, name: 'Admin' },
        customer: mockCustomer,
        manager: null,
      };

      const mockPermissions = [
        { permission: { name: 'users:read' } },
        { permission: { name: 'users:write' } },
      ];

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        userWithRole,
      );
      (prismaService.rolePermission.findMany as jest.Mock).mockResolvedValue(
        mockPermissions,
      );

      const result = await service.findOne(1);

      expect(result).toEqual({
        ...userWithRole,
        permissions: ['read', 'write'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      customerId: 1,
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update(1, updateUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1, customerId: 1 },
        data: updateUserDto,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update(999, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when user tries to change their own status', async () => {
      const updateUserDtoWithStatus = {
        ...updateUserDto,
        status: UserStatus.SUSPENDED,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.update(mockUser.id, updateUserDtoWithStatus, mockUser),
      ).rejects.toThrow('You cannot change your own status');
    });
  });

  describe('createSupabaseUser', () => {
    const mockSupabaseUser = {
      uid: 'supabase-uid',
      email: 'supabase@example.com',
      name: 'Supabase User',
      picture: 'https://example.com/avatar.jpg',
    };

    it('should create new user and customer for new domain', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.customer.create as jest.Mock).mockResolvedValue(
        mockCustomer,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      (supabaseService.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
        error: null,
      });
      (frontendPathsService.getSetNewPasswordUrl as jest.Mock).mockReturnValue(
        'http://localhost:3000/set-password',
      );

      const result = await service.createSupabaseUser(mockSupabaseUser);

      expect(prismaService.user.create).toHaveBeenCalled();
      expect(prismaService.customer.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return existing user if uid already exists', async () => {
      const existingUser = { ...mockUser, uid: 'supabase-uid' };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        existingUser,
      );

      const result = await service.createSupabaseUser(mockSupabaseUser);

      expect(result).toEqual(existingUser);
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('sendInviteEmail', () => {
    it('should send invite email successfully', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        uid: null,
        emailVerified: false,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        inactiveUser,
      );
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);
      (supabaseService.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
        error: null,
      });
      (frontendPathsService.getSetNewPasswordUrl as jest.Mock).mockReturnValue(
        'http://localhost:3000/set-password',
      );

      const result = await service.sendInviteEmail(inactiveUser);

      expect(supabaseService.admin.inviteUserByEmail).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw ConflictException for active user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.sendInviteEmail(mockUser)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('validateAndVoidOneTimeCode', () => {
    it('should validate and void one-time code successfully', async () => {
      const mockCode = {
        id: 1,
        code: '123456',
        userId: 1,
        isUsed: false,
        createdAt: new Date(),
      };

      (prismaService.userOneTimeCodes.findFirst as jest.Mock).mockResolvedValue(
        mockCode,
      );
      (prismaService.userOneTimeCodes.update as jest.Mock).mockResolvedValue(
        mockCode,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateAndVoidOneTimeCode('123456');

      expect(result).toBe(true);
      expect(prismaService.userOneTimeCodes.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...mockCode, isUsed: true },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          emailVerified: true,
          status: CustomerStatus.active,
        },
      });
    });

    it('should return false for invalid or expired code', async () => {
      (prismaService.userOneTimeCodes.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.validateAndVoidOneTimeCode('invalid');

      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should send reset password email successfully', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (
        supabaseService.auth.resetPasswordForEmail as jest.Mock
      ).mockResolvedValue({ error: null });
      (frontendPathsService.getUpdatePasswordUrl as jest.Mock).mockReturnValue(
        'http://localhost:3000/update-password',
      );

      const result = await service.resetPassword('test@example.com');

      expect(supabaseService.auth.resetPasswordForEmail).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'ok',
        message: 'Password reset link sent to your email.',
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resetPassword('nonexistent@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is not active', async () => {
      const inactiveUser = { ...mockUser, status: UserStatus.INACTIVE };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        inactiveUser,
      );

      await expect(service.resetPassword('test@example.com')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete user successfully', async () => {
      const userToDelete = {
        ...mockUser,
        isSuperadmin: false,
        isCustomerSuccess: false,
      };
      const deletedUser = {
        ...userToDelete,
        email: `__deleted__${userToDelete.email}`,
        status: UserStatus.SUSPENDED,
      };

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        userToDelete,
      );
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.user.update as jest.Mock).mockResolvedValue(deletedUser);
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.softDelete(1);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          email: `__deleted__${userToDelete.email}`,
          deletedAt: expect.any(Date),
          status: UserStatus.SUSPENDED,
          emailVerified: false,
          roleId: null,
        },
      });
      expect(result).toEqual(deletedUser);
    });

    it('should throw ConflictException for superadmin user', async () => {
      const superadminUser = { ...mockUser, isSuperadmin: true };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        superadminUser,
      );

      await expect(service.softDelete(1)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.softDelete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRandomString', () => {
    it('should generate random string of specified length', () => {
      const result = service.getRandomString(10);

      expect(result).toHaveLength(10);
      expect(typeof result).toBe('string');
    });

    it('should generate different strings on multiple calls', () => {
      const result1 = service.getRandomString(10);
      const result2 = service.getRandomString(10);

      expect(result1).not.toBe(result2);
    });
  });

  describe('applyOrderParams', () => {
    it('should apply order parameters correctly for name field', () => {
      const result = service['applyOrderParams']('name', 'asc');

      expect(result).toEqual([{ firstName: 'asc' }, { lastName: 'asc' }]);
    });

    it('should apply order parameters correctly for other fields', () => {
      const result = service['applyOrderParams']('email', 'desc');

      expect(result).toEqual({ email: 'desc' });
    });

    it('should use default values when parameters are undefined', () => {
      const result = service['applyOrderParams'](undefined, undefined);

      expect(result).toEqual({ id: 'desc' });
    });

    it('should throw ConflictException for invalid order by field', () => {
      expect(() =>
        service['applyOrderParams']('invalid' as any, 'asc'),
      ).toThrow(ConflictException);
    });
  });
});
