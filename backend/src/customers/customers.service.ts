import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { CustomerStatus, Prisma } from '@prisma/client';
import { createPaginator } from 'prisma-pagination';
import { getDomainFromEmail } from '@/common/helpers/string-helpers';
import { CreateCustomerDto } from '@/customers/dto/create-customer.dto';
import { ListCustomersInputDto } from '@/customers/dto/list-customers-input.dto';
import { ListCustomersOutputDto } from '@/customers/dto/list-customers-output.dto';
import { OutputTaxonomyDto } from '@/taxonomies/dto/output-taxonomy.dto';
import { UpdateCustomerDto } from '@/customers/dto/update-customer.dto';
import { isPublicEmailDomain } from '@/common/helpers/public-email-domains';

type SubscriptionDataType = {
  id: number;
  name: string;
  email: string;
  status: string;
  subscriptionId?: number;
  Manager: {
    id: number;
    name: string;
    Users: { email: string }[];
  };
  CustomerSuccess: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
  Subscription?: {
    id: number;
    name: string;
  };
  _count: {
    Users: number;
  };
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const { name, subscriptionId, ownerId, customerSuccessId } =
      createCustomerDto;
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId, deletedAt: null },
    });

    await this.validateOwner(ownerId);
    await this.validateCustomerOwner(owner!.email, ownerId, name);
    await this.validateSubscription(subscriptionId);
    await this.validateManger(customerSuccessId);

    const customer = await this.prisma.customer.create({
      data: {
        name,
        email: owner!.email,
        subscriptionId,
        domain: getDomainFromEmail(owner!.email),
        customerSuccessId,
        ownerId,
      },
    });

    await this.prisma.user.update({
      where: { id: ownerId, deletedAt: null },
      data: { customerId: customer.id },
    });

    return customer;
  }

  async findAll(
    listCustomersInput: ListCustomersInputDto,
  ): Promise<PaginatedOutputDto<ListCustomersOutputDto>> {
    const {
      id,
      search,
      status,
      subscriptionId,
      managerId,
      perPage,
      page,
      customerSuccessId,
    } = listCustomersInput;

    const where: Prisma.CustomerFindManyArgs['where'] = {
      ...(id && { id: { in: id } }),
      ...(subscriptionId && { subscriptionId: { in: subscriptionId } }),
      ...(managerId && { managerId: { in: managerId } }),
      ...(managerId && { managerId: { in: managerId } }),
      ...(customerSuccessId && {
        customerSuccessId: { in: customerSuccessId },
      }),
      ...(status && {
        status: {
          in: status.map((s) => s as CustomerStatus),
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const paginate = createPaginator({ perPage });
    const paginateResult = await paginate<
      SubscriptionDataType,
      Prisma.CustomerFindManyArgs
    >(
      this.prisma.customer,
      {
        where,
        include: {
          Manager: {
            select: {
              id: true,
              name: true,
              Users: { select: { email: true }, take: 1 },
            },
          },
          CustomerSuccess: {
            select: { id: true, firstName: true, lastName: true, email: true },
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
      { page },
    );

    const data = paginateResult.data.map((customer) => {
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        status: customer.status,
        customerSuccess: customer.CustomerSuccess
          ? {
              id: customer.CustomerSuccess.id,
              name: `${customer.CustomerSuccess.firstName ?? ''} ${customer.CustomerSuccess.lastName ?? ''}`.trim(),
              email: customer.CustomerSuccess.email,
            }
          : null,
        subscriptionId: customer.Subscription?.id,
        subscriptionName: customer.Subscription?.name,
        numberOfUsers: customer._count.Users,
      };
    });

    return { data, meta: paginateResult.meta };
  }

  getForTaxonomy(customerId: number | null): Promise<OutputTaxonomyDto[]> {
    let where = {};
    if (customerId) {
      where = {
        id: customerId,
      };
    }
    return this.prisma.customer.findMany({
      select: {
        id: true,
        name: true,
      },
      where,
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id },
      include: {
        CustomerSuccess: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        Subscription: { select: { id: true, name: true } },
        Owner: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { Users: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException('No customer with given ID exists');
    }

    const { Subscription, _count } = customer;

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      status: customer.status,
      customerSuccess: customer.CustomerSuccess
        ? {
            id: customer.CustomerSuccess.id,
            name: `${customer.CustomerSuccess.firstName ?? ''} ${customer.CustomerSuccess.lastName ?? ''}`.trim(),
            email: customer.CustomerSuccess.email,
          }
        : null,
      owner: customer.Owner
        ? {
            id: customer.Owner?.id,
            firstName: customer.Owner?.firstName,
            lastName: customer.Owner?.lastName,
          }
        : null,
      subscriptionId: Subscription?.id,
      subscriptionName: Subscription?.name,
      numberOfUsers: _count.Users,
    };
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const { name, subscriptionId, ownerId } = updateCustomerDto;
    await this.validateSubscription(subscriptionId);

    let ownerEmail = customer.email;
    if (ownerId && ownerId !== customer.ownerId) {
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId, deletedAt: null },
      });
      await this.validateOwner(ownerId);
      await this.validateCustomerOwner(
        owner!.email,
        ownerId,
        name || customer.name,
        customer.id,
      );
      ownerEmail = owner!.email;
      await this.prisma.user.update({
        where: { id: ownerId, deletedAt: null },
        data: { customerId: id },
      });
    }

    return this.prisma.customer.update({
      where: { id },
      data: { ...updateCustomerDto, email: ownerEmail },
    });
  }

  private async validateCustomerOwner(
    email: string,
    ownerId: number,
    name: string,
    ignoreCustomerId?: number,
  ) {
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        ...(ignoreCustomerId && { id: { not: ignoreCustomerId } }),
        OR: [{ name }, { email }, { ownerId }],
      },
    });

    if (existingCustomer && existingCustomer.name === name) {
      throw new ConflictException(
        `Customer with the same name already exists: ${name}`,
      );
    } else if (existingCustomer && existingCustomer.email === email) {
      throw new ConflictException(
        `Customer with the same email already exists: ${email}`,
      );
    } else if (existingCustomer && existingCustomer.ownerId === ownerId) {
      throw new ConflictException(
        `Customer with the same owner id already exists: ${ownerId}`,
      );
    }

    const domainCustomer = await this.prisma.customer.findFirst({
      where: {
        ...(ignoreCustomerId && { id: { not: ignoreCustomerId } }),
        domain: getDomainFromEmail(email),
      },
    });

    if (domainCustomer) {
      throw new ConflictException(
        `Customer with the same domain already exists: ${domainCustomer.domain}`,
      );
    }
  }

  private async validateSubscription(subscriptionId?: number) {
    if (!subscriptionId) return;

    const subscriptionExists = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!subscriptionExists) {
      throw new ConflictException(
        'Subscription with the given ID does not exist',
      );
    }
  }

  private async validateManger(managerId?: number) {
    if (!managerId) return;

    const manager = await this.prisma.user.findUnique({
      where: { id: managerId, deletedAt: null },
    });

    if (!manager) {
      throw new ConflictException(
        `Manager user not found with ID: ${managerId}`,
      );
    }

    if (!manager.isCustomerSuccess) {
      throw new ConflictException(
        'Manager user must have a customer success role',
      );
    }

    const findCustomer = await this.prisma.customer.findFirst({
      where: { customerSuccessId: managerId },
    });

    if (findCustomer) {
      throw new ConflictException(
        `Manager user with ID ${managerId} is already assigned to a customer: ${findCustomer.name}`,
      );
    }
  }

  private async validateOwner(ownerId?: number) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId, deletedAt: null },
    });

    if (!owner) {
      throw new ConflictException(`Owner user not found with ID: ${ownerId}`);
    }

    if (isPublicEmailDomain(owner.email)) {
      throw new ConflictException(
        'Owner email cannot be a public email domain',
      );
    } else if (owner.isSuperadmin) {
      throw new ConflictException(
        'Owner user cannot be a superadmin. Please assign a different user as the owner.',
      );
    } else if (owner.isCustomerSuccess) {
      throw new ConflictException(
        'Owner user cannot be a customer success role. Please assign a different user as the owner.',
      );
    }
  }

  remove(id: number) {
    throw new ConflictException(
      `Delete operation with ${id} is not supported at the moment.`,
    );
  }
}
