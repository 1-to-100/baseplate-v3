import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { getDomainFromEmail } from '@/common/helpers/string-helpers';
import { SYSTEM_ROLE_IDS } from '@/common/constants/system-roles';
import { CreateCustomerDto } from '@/customers/dto/create-customer.dto';
import { ListCustomersInputDto } from '@/customers/dto/list-customers-input.dto';
import { ListCustomersOutputDto } from '@/customers/dto/list-customers-output.dto';
import { OutputTaxonomyDto } from '@/taxonomies/dto/output-taxonomy.dto';
import { UpdateCustomerDto } from '@/customers/dto/update-customer.dto';
import { isPublicEmailDomain } from '@/common/helpers/public-email-domains';

@Injectable()
export class CustomersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const { name, subscriptionId, ownerId, customerSuccessId } =
      createCustomerDto;

    const owner = await this.database.findUnique('users', {
      where: { id: ownerId, deleted_at: null },
    });

    await this.validateOwner(ownerId);
    await this.validateCustomerOwner(owner!.email, ownerId, name);
    await this.validateSubscription(subscriptionId);
    await this.validateManger(customerSuccessId);

    const customer = await this.database.create('customers', {
      data: {
        name,
        email: owner!.email,
        subscription_id: subscriptionId,
        domain: getDomainFromEmail(owner!.email),
        customer_success_id: customerSuccessId,
        owner_id: ownerId,
      },
    });

    await this.database.update('users', {
      where: { id: ownerId, deleted_at: null },
      data: { customer_id: customer.id },
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

    const where: any = {
      ...(id && { id: { in: id } }),
      ...(subscriptionId && { subscription_id: { in: subscriptionId } }),
      ...(managerId && { manager_id: { in: managerId } }),
      ...(customerSuccessId && {
        customer_success_id: { in: customerSuccessId },
      }),
      ...(status && {
        status: { in: status },
      }),
      ...(search && {
        or: [
          { name: { ilike: `%${search}%` } },
          { email: { ilike: `%${search}%` } },
        ],
      }),
    };

    const paginateResult = await this.database.paginate(
      'customers',
      { page: page || 1, per_page: perPage || 10 },
      {
        where,
        orderBy: [{ field: 'id', direction: 'desc' }],
      },
    );

    // For each customer, fetch related data
    const data = await Promise.all(
      paginateResult.data.map(async (customer: any) => {
        // Get customer success user if exists
        const customerSuccessUser = customer.customer_success_id
          ? await this.database.findUnique('users', {
              where: { id: customer.customer_success_id },
              select: 'id, first_name, last_name, email',
            })
          : null;

        // Get subscription if exists
        const subscription = customer.subscription_id
          ? await this.database.findUnique('subscriptions', {
              where: { id: customer.subscription_id },
              select: 'id, name',
            })
          : null;

        // Count users for this customer (excluding system roles)
        // Use raw Supabase query since notIn is not supported in our WhereClause type
        const { count: userCount } = await this.supabaseService
          .getClient()
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customer.id)
          .not(
            'role_id',
            'in',
            `(${SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR},${SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS})`,
          );

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          status: customer.status,
          customerSuccess: customerSuccessUser
            ? {
                id: customerSuccessUser.id,
                name: `${customerSuccessUser.first_name ?? ''} ${customerSuccessUser.last_name ?? ''}`.trim(),
                email: customerSuccessUser.email,
              }
            : null,
          subscriptionId: subscription?.id,
          subscriptionName: subscription?.name,
          numberOfUsers: userCount ?? 0,
        };
      }),
    );

    // Transform PaginationMeta to match PaginatedOutputDto format
    const transformedMeta = {
      total: paginateResult.meta.total,
      lastPage: paginateResult.meta.total_pages,
      currentPage: paginateResult.meta.page,
      perPage: paginateResult.meta.per_page,
      prev: paginateResult.meta.page > 1 ? paginateResult.meta.page - 1 : null,
      next:
        paginateResult.meta.page < paginateResult.meta.total_pages
          ? paginateResult.meta.page + 1
          : null,
    };

    return { data, meta: transformedMeta };
  }

  async getForTaxonomy(
    customerId: number | null,
  ): Promise<OutputTaxonomyDto[]> {
    const options: any = {
      select: 'id, name',
    };

    if (customerId) {
      options.where = { id: customerId };
    }

    return await this.database.findMany('customers', options);
  }

  async findOne(id: number) {
    const customer = await this.database.findUnique('customers', {
      where: { id },
      include: {
        users: true, // This will include both CustomerSuccess and Owner
        subscriptions: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('No customer with given ID exists');
    }

    // Get user count for this customer
    const userCount = await this.database.count('users', {
      where: { customer_id: id },
    });

    // Find customer success user
    const customerSuccessUser = customer.customer_success_id
      ? await this.database.findUnique('users', {
          where: { id: customer.customer_success_id },
          select: 'id, first_name, last_name, email',
        })
      : null;

    // Find owner user
    const ownerUser = customer.owner_id
      ? await this.database.findUnique('users', {
          where: { id: customer.owner_id },
          select: 'id, first_name, last_name',
        })
      : null;

    // Get subscription if exists
    const subscription = customer.subscription_id
      ? await this.database.findUnique('subscriptions', {
          where: { id: customer.subscription_id },
          select: 'id, name',
        })
      : null;

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      status: customer.status,
      customerSuccess: customerSuccessUser
        ? {
            id: customerSuccessUser.id,
            name: `${customerSuccessUser.first_name ?? ''} ${customerSuccessUser.last_name ?? ''}`.trim(),
            email: customerSuccessUser.email,
          }
        : null,
      owner: ownerUser
        ? {
            id: ownerUser.id,
            firstName: ownerUser.first_name,
            lastName: ownerUser.last_name,
          }
        : null,
      subscriptionId: subscription?.id,
      subscriptionName: subscription?.name,
      numberOfUsers: userCount,
    };
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.database.findUnique('customers', {
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const { name, subscriptionId, ownerId } = updateCustomerDto;
    await this.validateSubscription(subscriptionId);

    let ownerEmail = customer.email;
    if (ownerId && ownerId !== customer.owner_id) {
      const owner = await this.database.findUnique('users', {
        where: { id: ownerId, deleted_at: null },
      });
      await this.validateOwner(ownerId);
      await this.validateCustomerOwner(
        owner!.email,
        ownerId,
        name || customer.name,
        customer.id,
      );
      ownerEmail = owner!.email;
      await this.database.update('users', {
        where: { id: ownerId, deleted_at: null },
        data: { customer_id: id },
      });
    }

    // Convert camelCase DTO fields to snake_case for database
    const updateData = {
      name,
      subscription_id: subscriptionId,
      owner_id: ownerId,
      email: ownerEmail,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    return this.database.update('customers', {
      where: { id },
      data: updateData,
    });
  }

  private async validateCustomerOwner(
    email: string,
    ownerId: number,
    name: string,
    ignoreCustomerId?: number,
  ) {
    const where = {
      ...(ignoreCustomerId && { id: { not: ignoreCustomerId } }),
      or: [{ name }, { email }, { owner_id: ownerId }],
    };

    const existingCustomer = await this.database.findFirst('customers', {
      where,
    });

    if (existingCustomer && existingCustomer.name === name) {
      throw new ConflictException(
        `Customer with the same name already exists: ${name}`,
      );
    } else if (existingCustomer && existingCustomer.email === email) {
      throw new ConflictException(
        `Customer with the same email already exists: ${email}`,
      );
    } else if (existingCustomer && existingCustomer.owner_id === ownerId) {
      throw new ConflictException(
        `Customer with the same owner id already exists: ${ownerId}`,
      );
    }

    const domainWhere = {
      ...(ignoreCustomerId && { id: { not: ignoreCustomerId } }),
      domain: getDomainFromEmail(email),
    };

    const domainCustomer = await this.database.findFirst('customers', {
      where: domainWhere,
    });

    if (domainCustomer) {
      throw new ConflictException(
        `Customer with the same domain already exists: ${domainCustomer.domain}`,
      );
    }
  }

  private async validateSubscription(subscriptionId?: number) {
    if (!subscriptionId) return;

    const subscriptionExists = await this.database.findUnique('subscriptions', {
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

    const manager = await this.database.findUnique('users', {
      where: { id: managerId, deleted_at: null },
    });

    if (!manager) {
      throw new ConflictException(
        `Manager user not found with ID: ${managerId}`,
      );
    }

    if (manager.role_id !== SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS) {
      throw new ConflictException(
        'Manager user must have a customer success role',
      );
    }

    const findCustomer = await this.database.findFirst('customers', {
      where: { customer_success_id: managerId },
    });

    if (findCustomer) {
      throw new ConflictException(
        `Manager user with ID ${managerId} is already assigned to a customer: ${findCustomer.name}`,
      );
    }
  }

  private async validateOwner(ownerId?: number) {
    if (!ownerId) return;

    const owner = await this.database.findUnique('users', {
      where: { id: ownerId, deleted_at: null },
    });

    if (!owner) {
      throw new ConflictException(`Owner user not found with ID: ${ownerId}`);
    }

    if (isPublicEmailDomain(owner.email)) {
      throw new ConflictException(
        'Owner email cannot be a public email domain',
      );
    } else if (owner.role_id === SYSTEM_ROLE_IDS.SYSTEM_ADMINISTRATOR) {
      throw new ConflictException(
        'Owner user cannot be a system administrator. Please assign a different user as the owner.',
      );
    } else if (owner.role_id === SYSTEM_ROLE_IDS.CUSTOMER_SUCCESS) {
      throw new ConflictException(
        'Owner user cannot have a customer success role. Please assign a different user as the owner.',
      );
    }
  }

  remove(id: number) {
    throw new ConflictException(
      `Delete operation with ${id} is not supported at the moment.`,
    );
  }
}
