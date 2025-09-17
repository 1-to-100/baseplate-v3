import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersInputDto } from './dto/list-customers-input.dto';
import { CustomerStatus } from '@prisma/client';

// Mock prisma-pagination
jest.mock('prisma-pagination', () => ({
  createPaginator: jest.fn(() =>
    jest.fn().mockResolvedValue({
      data: [],
      meta: {
        total: 0,
        lastPage: 1,
        currentPage: 1,
        perPage: 10,
        prev: null,
        next: null,
      },
    }),
  ),
}));

describe('CustomersService', () => {
  let service: CustomersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prismaService = module.get(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Reset the createPaginator mock
    const { createPaginator } = require('prisma-pagination');
    createPaginator.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createCustomerDto: CreateCustomerDto = {
      name: 'Test Customer',
      subscriptionId: 1,
      ownerId: 1,
      customerSuccessId: 2,
    };

    const mockOwner = {
      id: 1,
      email: 'owner@testcompany.com',
      isSuperadmin: false,
      isCustomerSuccess: false,
      deletedAt: null,
    };

    const mockCustomerSuccess = {
      id: 2,
      email: 'cs@company.com',
      isCustomerSuccess: true,
      deletedAt: null,
    };

    const mockSubscription = {
      id: 1,
      name: 'Basic Plan',
    };

    const mockCreatedCustomer = {
      id: 1,
      name: 'Test Customer',
      email: 'owner@testcompany.com',
      subscriptionId: 1,
      domain: 'testcompany.com',
      customerSuccessId: 2,
      ownerId: 1,
    };

    it('should create a customer successfully', async () => {
      // Mock validation methods
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwner) // validateOwner
        .mockResolvedValueOnce(mockOwner); // validateCustomerOwner

      (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue(
        mockSubscription,
      );
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockCustomerSuccess) // validateManager
        .mockResolvedValueOnce(null); // validateCustomerOwner - no existing customer

      (prismaService.customer.create as jest.Mock).mockResolvedValue(
        mockCreatedCustomer,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockOwner);

      const result = await service.create(createCustomerDto);

      expect(result).toEqual(mockCreatedCustomer);
      expect(prismaService.customer.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Customer',
          email: 'owner@testcompany.com',
          subscriptionId: 1,
          domain: 'testcompany.com',
          customerSuccessId: 2,
          ownerId: 1,
        },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        data: { customerId: 1 },
      });
    });

    it('should throw ConflictException when owner is not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        new ConflictException('Owner user not found with ID: 1'),
      );
    });

    it('should throw ConflictException when owner is superadmin', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockOwner,
        isSuperadmin: true,
      });

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        new ConflictException(
          'Owner user cannot be a superadmin. Please assign a different user as the owner.',
        ),
      );
    });

    it('should throw ConflictException when owner is customer success', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockOwner,
        isCustomerSuccess: true,
      });

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        new ConflictException(
          'Owner user cannot be a customer success role. Please assign a different user as the owner.',
        ),
      );
    });

    it('should throw ConflictException when subscription does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockOwner);
      (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        new ConflictException('Subscription with the given ID does not exist'),
      );
    });

    it('should throw ConflictException when customer success manager is not found', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwner) // First call in create method
        .mockResolvedValueOnce(mockOwner) // validateOwner
        .mockResolvedValueOnce(null); // validateManager - customer success not found

      (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue(
        mockSubscription,
      );

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        new ConflictException('Manager user not found with ID: 2'),
      );
    });

    it('should throw ConflictException when customer success is not a customer success role', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwner) // First call in create method
        .mockResolvedValueOnce(mockOwner) // validateOwner
        .mockResolvedValueOnce({
          ...mockCustomerSuccess,
          isCustomerSuccess: false,
        }); // validateManager

      (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue(
        mockSubscription,
      );

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        new ConflictException('Manager user must have a customer success role'),
      );
    });

    it('should throw ConflictException when customer success is already assigned', async () => {
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwner) // First call in create method
        .mockResolvedValueOnce(mockOwner) // validateOwner
        .mockResolvedValueOnce(mockCustomerSuccess); // validateManager

      (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue(
        mockSubscription,
      );
      (prismaService.customer.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // First call in validateCustomerOwner
        .mockResolvedValueOnce(null) // Second call in validateCustomerOwner
        .mockResolvedValueOnce({
          id: 3,
          name: 'Existing Customer',
        }); // validateManager - customer success already assigned

      await expect(service.create(createCustomerDto)).rejects.toThrow(
        new ConflictException(
          'Manager user with ID 2 is already assigned to a customer: Existing Customer',
        ),
      );
    });
  });

  describe('findAll', () => {
    const mockCustomers = [
      {
        id: 1,
        name: 'Customer 1',
        email: 'customer1@test.com',
        status: CustomerStatus.active,
        Manager: {
          id: 1,
          name: 'Manager 1',
          Users: [{ email: 'manager1@test.com' }],
        },
        CustomerSuccess: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
        },
        Subscription: {
          id: 1,
          name: 'Basic Plan',
        },
        _count: {
          Users: 5,
        },
      },
    ];

    const mockPaginatedResult = {
      data: mockCustomers,
      meta: {
        total: 1,
        lastPage: 1,
        currentPage: 1,
        perPage: 10,
        prev: null,
        next: null,
      },
    };

    it('should return paginated customers without filters', async () => {
      const listInput: ListCustomersInputDto = {
        page: 1,
        perPage: 10,
      };

      // Mock the paginator function
      const mockPaginator = jest.fn().mockResolvedValue(mockPaginatedResult);
      const { createPaginator } = require('prisma-pagination');
      createPaginator.mockReturnValue(mockPaginator);

      const result = await service.findAll(listInput);

      expect(result).toEqual({
        data: [
          {
            id: 1,
            name: 'Customer 1',
            email: 'customer1@test.com',
            status: CustomerStatus.active,
            customerSuccess: {
              id: 1,
              name: 'John Doe',
              email: 'john.doe@test.com',
            },
            subscriptionId: 1,
            subscriptionName: 'Basic Plan',
            numberOfUsers: 5,
          },
        ],
        meta: mockPaginatedResult.meta,
      });
    });

    it('should apply filters correctly', async () => {
      const listInput: ListCustomersInputDto = {
        page: 1,
        perPage: 10,
        id: [1, 2],
        search: 'test',
        status: [CustomerStatus.active],
        subscriptionId: [1],
        managerId: [1],
        customerSuccessId: [1],
      };

      // Mock the paginator function
      const mockPaginator = jest.fn().mockResolvedValue(mockPaginatedResult);
      const { createPaginator } = require('prisma-pagination');
      createPaginator.mockReturnValue(mockPaginator);

      await service.findAll(listInput);

      expect(mockPaginator).toHaveBeenCalledWith(
        prismaService.customer,
        {
          where: {
            id: { in: [1, 2] },
            subscriptionId: { in: [1] },
            managerId: { in: [1] },
            customerSuccessId: { in: [1] },
            status: {
              in: [CustomerStatus.active],
            },
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
            ],
          },
          include: {
            Manager: {
              select: {
                id: true,
                name: true,
                Users: { select: { email: true }, take: 1 },
              },
            },
            CustomerSuccess: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            Subscription: { select: { id: true, name: true } },
            _count: {
              select: {
                Users: {
                  where: { isSuperadmin: false, isCustomerSuccess: false },
                },
              },
            },
          },
          orderBy: { id: 'desc' },
        },
        { page: 1 },
      );
    });
  });

  describe('findOne', () => {
    const mockCustomer = {
      id: 1,
      name: 'Test Customer',
      email: 'test@customer.com',
      status: CustomerStatus.active,
      CustomerSuccess: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
      },
      Subscription: {
        id: 1,
        name: 'Basic Plan',
      },
      Owner: {
        id: 1,
        firstName: 'Owner',
        lastName: 'User',
      },
      _count: {
        Users: 5,
      },
    };

    it('should return customer by id', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(
        mockCustomer,
      );

      const result = await service.findOne(1);

      expect(result).toEqual({
        id: 1,
        name: 'Test Customer',
        email: 'test@customer.com',
        status: CustomerStatus.active,
        customerSuccess: {
          id: 1,
          name: 'John Doe',
          email: 'john.doe@test.com',
        },
        owner: {
          id: 1,
          firstName: 'Owner',
          lastName: 'User',
        },
        subscriptionId: 1,
        subscriptionName: 'Basic Plan',
        numberOfUsers: 5,
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('No customer with given ID exists'),
      );
    });
  });

  describe('update', () => {
    const updateCustomerDto: UpdateCustomerDto = {
      name: 'Updated Customer',
      subscriptionId: 2,
    };

    const mockExistingCustomer = {
      id: 1,
      name: 'Original Customer',
      email: 'original@customer.com',
      ownerId: 1,
    };

    const mockUpdatedCustomer = {
      ...mockExistingCustomer,
      name: 'Updated Customer',
      subscriptionId: 2,
    };

    it('should update customer successfully', async () => {
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
        mockExistingCustomer,
      );
      (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        name: 'Premium Plan',
      });
      (prismaService.customer.update as jest.Mock).mockResolvedValue(
        mockUpdatedCustomer,
      );

      const result = await service.update(1, updateCustomerDto);

      expect(result).toEqual(mockUpdatedCustomer);
      expect(prismaService.customer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...updateCustomerDto, email: 'original@customer.com' },
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update(999, updateCustomerDto)).rejects.toThrow(
        new NotFoundException('Customer with ID 999 not found'),
      );
    });

    it('should throw ConflictException when subscription does not exist', async () => {
      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
        mockExistingCustomer,
      );
      (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.update(1, updateCustomerDto)).rejects.toThrow(
        new ConflictException('Subscription with the given ID does not exist'),
      );
    });

    it('should update owner when ownerId is provided', async () => {
      const updateWithOwnerDto = {
        ...updateCustomerDto,
        ownerId: 2,
      };

      const mockNewOwner = {
        id: 2,
        email: 'newowner@test.com',
        isSuperadmin: false,
        isCustomerSuccess: false,
        deletedAt: null,
      };

      (prismaService.customer.findUnique as jest.Mock).mockResolvedValue(
        mockExistingCustomer,
      );
      (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        name: 'Premium Plan',
      });
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockNewOwner) // First call in update method
        .mockResolvedValueOnce(mockNewOwner) // validateOwner
        .mockResolvedValueOnce(null); // validateCustomerOwner - no existing customer
      (prismaService.customer.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // First call in validateCustomerOwner
        .mockResolvedValueOnce(null); // Second call in validateCustomerOwner
      (prismaService.customer.update as jest.Mock).mockResolvedValue(
        mockUpdatedCustomer,
      );
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockNewOwner);

      await service.update(1, updateWithOwnerDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 2, deletedAt: null },
        data: { customerId: 1 },
      });
      expect(prismaService.customer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...updateWithOwnerDto, email: 'newowner@test.com' },
      });
    });
  });

  describe('getForTaxonomy', () => {
    const mockTaxonomyData = [
      { id: 1, name: 'Customer 1' },
      { id: 2, name: 'Customer 2' },
    ];

    it('should return all customers for taxonomy when customerId is null', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue(
        mockTaxonomyData,
      );

      const result = await service.getForTaxonomy(null);

      expect(result).toEqual(mockTaxonomyData);
      expect(prismaService.customer.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
        },
        where: {},
      });
    });

    it('should return specific customer for taxonomy when customerId is provided', async () => {
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([
        mockTaxonomyData[0],
      ]);

      const result = await service.getForTaxonomy(1);

      expect(result).toEqual([mockTaxonomyData[0]]);
      expect(prismaService.customer.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
        },
        where: {
          id: 1,
        },
      });
    });
  });

  describe('remove', () => {
    it('should throw ConflictException as delete is not supported', () => {
      expect(() => service.remove(1)).toThrow(
        new ConflictException(
          'Delete operation with 1 is not supported at the moment.',
        ),
      );
    });
  });

  describe('private validation methods', () => {
    describe('validateCustomerOwner', () => {
      beforeEach(() => {
        // Reset customer.findFirst mock for each test
        (prismaService.customer.findFirst as jest.Mock).mockReset();
      });

      it('should throw ConflictException when customer with same name exists', async () => {
        (prismaService.customer.findFirst as jest.Mock)
          .mockResolvedValueOnce({
            id: 2,
            name: 'Test Customer',
            email: 'other@test.com',
            ownerId: 2,
          })
          .mockResolvedValueOnce(null);

        await expect(
          (service as any).validateCustomerOwner(
            'test@company.com',
            1,
            'Test Customer',
          ),
        ).rejects.toThrow(
          new ConflictException(
            'Customer with the same name already exists: Test Customer',
          ),
        );
      });

      it('should throw ConflictException when customer with same email exists', async () => {
        (prismaService.customer.findFirst as jest.Mock)
          .mockResolvedValueOnce({
            id: 2,
            name: 'Other Customer',
            email: 'test@company.com',
            ownerId: 2,
          })
          .mockResolvedValueOnce(null);

        await expect(
          (service as any).validateCustomerOwner(
            'test@company.com',
            1,
            'Test Customer',
          ),
        ).rejects.toThrow(
          new ConflictException(
            'Customer with the same email already exists: test@company.com',
          ),
        );
      });

      it('should throw ConflictException when customer with same owner exists', async () => {
        (prismaService.customer.findFirst as jest.Mock)
          .mockResolvedValueOnce({
            id: 2,
            name: 'Other Customer',
            email: 'other@test.com',
            ownerId: 1,
          })
          .mockResolvedValueOnce(null);

        await expect(
          (service as any).validateCustomerOwner(
            'test@company.com',
            1,
            'Test Customer',
          ),
        ).rejects.toThrow(
          new ConflictException(
            'Customer with the same owner id already exists: 1',
          ),
        );
      });

      it('should throw ConflictException when customer with same domain exists', async () => {
        (prismaService.customer.findFirst as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 2,
            name: 'Other Customer',
            domain: 'company.com',
          });

        await expect(
          (service as any).validateCustomerOwner(
            'test@company.com',
            1,
            'Test Customer',
          ),
        ).rejects.toThrow(
          new ConflictException(
            'Customer with the same domain already exists: company.com',
          ),
        );
      });
    });

    describe('validateSubscription', () => {
      it('should not throw when subscription exists', async () => {
        (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue({
          id: 1,
          name: 'Basic Plan',
        });

        await expect(
          (service as any).validateSubscription(1),
        ).resolves.not.toThrow();
      });

      it('should throw ConflictException when subscription does not exist', async () => {
        (prismaService.subscription.findUnique as jest.Mock).mockResolvedValue(
          null,
        );

        await expect(
          (service as any).validateSubscription(999),
        ).rejects.toThrow(
          new ConflictException(
            'Subscription with the given ID does not exist',
          ),
        );
      });

      it('should not throw when subscriptionId is undefined', async () => {
        await expect(
          (service as any).validateSubscription(undefined),
        ).resolves.not.toThrow();
        expect(prismaService.subscription.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('validateManager', () => {
      beforeEach(() => {
        // Reset customer.findFirst mock for each test
        (prismaService.customer.findFirst as jest.Mock).mockReset();
        (prismaService.user.findUnique as jest.Mock).mockReset();
      });

      it('should not throw when manager exists and is customer success', async () => {
        const mockManager = {
          id: 1,
          email: 'manager@test.com',
          isCustomerSuccess: true,
          deletedAt: null,
        };

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockManager,
        );
        (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

        await expect((service as any).validateManger(1)).resolves.not.toThrow();
      });

      it('should throw ConflictException when manager is not found', async () => {
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

        await expect((service as any).validateManger(999)).rejects.toThrow(
          new ConflictException('Manager user not found with ID: 999'),
        );
      });

      it('should throw ConflictException when manager is not customer success', async () => {
        const mockManager = {
          id: 1,
          email: 'manager@test.com',
          isCustomerSuccess: false,
          deletedAt: null,
        };

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockManager,
        );

        await expect((service as any).validateManger(1)).rejects.toThrow(
          new ConflictException(
            'Manager user must have a customer success role',
          ),
        );
      });

      it('should throw ConflictException when manager is already assigned', async () => {
        const mockManager = {
          id: 1,
          email: 'manager@test.com',
          isCustomerSuccess: true,
          deletedAt: null,
        };

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockManager,
        );
        (prismaService.customer.findFirst as jest.Mock).mockResolvedValue({
          id: 1,
          name: 'Existing Customer',
        });

        await expect((service as any).validateManger(1)).rejects.toThrow(
          new ConflictException(
            'Manager user with ID 1 is already assigned to a customer: Existing Customer',
          ),
        );
      });

      it('should not throw when managerId is undefined', async () => {
        await expect(
          (service as any).validateManger(undefined),
        ).resolves.not.toThrow();
        expect(prismaService.user.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('validateOwner', () => {
      it('should not throw when owner exists and is valid', async () => {
        const mockOwner = {
          id: 1,
          email: 'owner@company.com',
          isSuperadmin: false,
          isCustomerSuccess: false,
          deletedAt: null,
        };

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockOwner,
        );

        await expect((service as any).validateOwner(1)).resolves.not.toThrow();
      });

      it('should throw ConflictException when owner is not found', async () => {
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

        await expect((service as any).validateOwner(999)).rejects.toThrow(
          new ConflictException('Owner user not found with ID: 999'),
        );
      });

      it('should throw ConflictException when owner is superadmin', async () => {
        const mockOwner = {
          id: 1,
          email: 'admin@company.com',
          isSuperadmin: true,
          isCustomerSuccess: false,
          deletedAt: null,
        };

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockOwner,
        );

        await expect((service as any).validateOwner(1)).rejects.toThrow(
          new ConflictException(
            'Owner user cannot be a superadmin. Please assign a different user as the owner.',
          ),
        );
      });

      it('should throw ConflictException when owner is customer success', async () => {
        const mockOwner = {
          id: 1,
          email: 'cs@company.com',
          isSuperadmin: false,
          isCustomerSuccess: true,
          deletedAt: null,
        };

        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockOwner,
        );

        await expect((service as any).validateOwner(1)).rejects.toThrow(
          new ConflictException(
            'Owner user cannot be a customer success role. Please assign a different user as the owner.',
          ),
        );
      });
    });
  });
});
