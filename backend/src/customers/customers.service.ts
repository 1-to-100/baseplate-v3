import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { PaginatedOutputDto } from '@/common/dto/paginated-output.dto';
import { getDomainFromEmail } from '@/common/helpers/string-helpers';
import { SYSTEM_ROLES } from '@/common/constants/system-roles';
import { CustomerLifecycleStage } from '@/common/types/database.types';
import { CreateCustomerDto } from '@/customers/dto/create-customer.dto';
import { ListCustomersInputDto } from '@/customers/dto/list-customers-input.dto';
import { ListCustomersOutputDto } from '@/customers/dto/list-customers-output.dto';
import { OutputTaxonomyDto } from '@/taxonomies/dto/output-taxonomy.dto';
import { UpdateCustomerDto } from '@/customers/dto/update-customer.dto';
import { isPublicEmailDomain } from '@/common/helpers/public-email-domains';
import { parseUserName } from '@/common/helpers/schema-mappers';

@Injectable()
export class CustomersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly supabaseService: SupabaseService,
  ) {}

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

  async create(createCustomerDto: CreateCustomerDto) {
    const { name, subscriptionId, ownerId, customerSuccessId } =
      createCustomerDto;

    const owner = await this.database.findUnique('users', {
      where: { user_id: ownerId, deleted_at: null },
    });

    await this.validateOwner(ownerId);
    await this.validateCustomerOwner(owner!.email, ownerId, name);
    await this.validateSubscription(subscriptionId);
    await this.validateManger(customerSuccessId);

    const customer = await this.database.create('customers', {
      data: {
        name,
        subscription_type_id: subscriptionId, // Changed from subscription_id
        email_domain: getDomainFromEmail(owner!.email), // Changed from domain
        manager_id: customerSuccessId,
        owner_id: ownerId,
        lifecycle_stage: CustomerLifecycleStage.ONBOARDING, // Changed from status
        active: true, // New field
      },
    });

    await this.database.update('users', {
      where: { user_id: ownerId, deleted_at: null },
      data: { customer_id: customer.customer_id },
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
      ...(id && { customer_id: { in: id } }), // Changed from id
      ...(subscriptionId && { subscription_type_id: { in: subscriptionId } }), // Changed from subscription_id
      ...(managerId && { manager_id: { in: managerId } }),
      ...(customerSuccessId && {
        manager_id: { in: customerSuccessId },
      }),
      // Map status to lifecycle_stage
      ...(status && {
        lifecycle_stage: { in: status },
      }),
      ...(search && {
        or: [
          { name: { ilike: `%${search}%` } },
          { email_domain: { ilike: `%${search}%` } },
        ],
      }),
    };

    const paginateResult = await this.database.paginate(
      'customers',
      { page: page || 1, per_page: perPage || 10 },
      {
        where,
        orderBy: [{ field: 'customer_id', direction: 'desc' }], // Changed from id
      },
    );

    // For each customer, fetch related data
    const data = await Promise.all(
      paginateResult.data.map(async (customer: any) => {
        // Get owner user to fetch email
        const ownerUser = customer.owner_id
          ? await this.database.findUnique('users', {
              where: { user_id: customer.owner_id },
              select: 'user_id, email',
            })
          : null;

        // Get customer success user if exists
        const customerSuccessUser = customer.manager_id
          ? await this.database.findUnique('users', {
              where: { user_id: customer.manager_id },
              select: 'user_id, full_name, email',
            })
          : null;

        // Get subscription type if exists
        const subscription = customer.subscription_type_id
          ? await this.database.findUnique('subscription_types', {
              where: { subscription_type_id: customer.subscription_type_id },
              select: 'subscription_type_id, name',
            })
          : null;

        // Count users for this customer (excluding system roles, including users with no role)
        const systemRoleIds = await this.getSystemRoleIds();
        const userCount = await this.database.count('users', {
          where: {
            AND: [
              { customer_id: customer.customer_id },
              {
                OR: [
                  { role_id: null },
                  {
                    role_id: {
                      not: {
                        in: systemRoleIds,
                      },
                    },
                  },
                ],
              },
            ],
          },
        });

        return {
          id: customer.customer_id,
          name: customer.name,
          email: ownerUser?.email || '',
          status: customer.lifecycle_stage, // Map lifecycle_stage to status for API
          customerSuccess: customerSuccessUser
            ? {
                id: customerSuccessUser.user_id,
                name: customerSuccessUser.full_name,
                email: customerSuccessUser.email,
              }
            : null,
          subscriptionId: subscription?.subscription_type_id,
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
    customerId: string | null,
  ): Promise<OutputTaxonomyDto[]> {
    const options: any = {
      select: 'customer_id, name', // Changed from id
    };

    if (customerId) {
      options.where = { customer_id: customerId }; // Changed from id
    }

    const customers = await this.database.findMany('customers', options);

    // Map to taxonomy format
    return customers.map((c) => ({
      id: c.customer_id,
      name: c.name,
    }));
  }

  async findOne(id: string) {
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: id }, // Changed from id
      include: {
        users: true,
        subscription_types: true, // Changed from subscriptions
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
    const customerSuccessUser = customer.manager_id
      ? await this.database.findUnique('users', {
          where: { user_id: customer.manager_id },
          select: 'user_id, full_name, email',
        })
      : null;

    // Find owner user
    const ownerUser = customer.owner_id
      ? await this.database.findUnique('users', {
          where: { user_id: customer.owner_id },
          select: 'user_id, full_name, email',
        })
      : null;

    // Get subscription type if exists
    const subscription = customer.subscription_type_id
      ? await this.database.findUnique('subscription_types', {
          where: { subscription_type_id: customer.subscription_type_id },
          select: 'subscription_type_id, name',
        })
      : null;

    // Parse names
    const csName = customerSuccessUser?.full_name
      ? parseUserName(customerSuccessUser.full_name)
      : null;
    const ownerName = ownerUser?.full_name
      ? parseUserName(ownerUser.full_name)
      : null;

    return {
      id: customer.customer_id,
      name: customer.name,
      email: ownerUser?.email || '',
      status: customer.lifecycle_stage, // Map for API
      customerSuccess:
        customerSuccessUser && csName
          ? {
              id: customerSuccessUser.user_id,
              name: customerSuccessUser.full_name,
              email: customerSuccessUser.email,
            }
          : null,
      owner:
        ownerUser && ownerName
          ? {
              id: ownerUser.user_id,
              firstName: ownerName.firstName,
              lastName: ownerName.lastName,
            }
          : null,
      subscriptionId: subscription?.subscription_type_id,
      subscriptionName: subscription?.name,
      numberOfUsers: userCount,
    };
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: id }, // Changed from id
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const { name, subscriptionId, ownerId } = updateCustomerDto;
    await this.validateSubscription(subscriptionId);

    let ownerEmail: string | undefined;
    if (ownerId && ownerId !== customer.owner_id) {
      const owner = await this.database.findUnique('users', {
        where: { user_id: ownerId, deleted_at: null },
      });
      await this.validateOwner(ownerId);
      await this.validateCustomerOwner(
        owner!.email,
        ownerId,
        name || customer.name,
        customer.customer_id,
      );
      ownerEmail = owner!.email;
      await this.database.update('users', {
        where: { user_id: ownerId, deleted_at: null },
        data: { customer_id: id },
      });
    }

    // Build update data with proper field names
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (subscriptionId !== undefined)
      updateData.subscription_type_id = subscriptionId; // Changed from subscription_id
    if (ownerId !== undefined) updateData.owner_id = ownerId;
    if (ownerEmail !== undefined)
      updateData.email_domain = getDomainFromEmail(ownerEmail);

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    return this.database.update('customers', {
      where: { customer_id: id }, // Changed from id
      data: updateData,
    });
  }

  private async validateCustomerOwner(
    email: string,
    ownerId: string,
    name: string,
    ignoreCustomerId?: string,
  ) {
    const where: any = {
      ...(ignoreCustomerId && { customer_id: { not: ignoreCustomerId } }), // Changed from id
      or: [{ name }, { email }, { owner_id: ownerId }],
    };

    const existingCustomer = await this.database.findFirst('customers', {
      where,
    });

    if (existingCustomer && existingCustomer.name === name) {
      throw new ConflictException(
        `Customer with the same name already exists: ${name}`,
      );
    } else if (
      existingCustomer &&
      existingCustomer.email_domain === getDomainFromEmail(email)
    ) {
      throw new ConflictException(
        `Customer with the same email domain already exists: ${getDomainFromEmail(email)}`,
      );
    } else if (existingCustomer && existingCustomer.owner_id === ownerId) {
      throw new ConflictException(
        `Customer with the same owner id already exists: ${ownerId}`,
      );
    }

    const domainWhere: any = {
      ...(ignoreCustomerId && { customer_id: { not: ignoreCustomerId } }), // Changed from id
      email_domain: getDomainFromEmail(email), // Changed from domain
    };

    const domainCustomer = await this.database.findFirst('customers', {
      where: domainWhere,
    });

    if (domainCustomer) {
      throw new ConflictException(
        `Customer with the same domain already exists: ${domainCustomer.email_domain}`,
      );
    }
  }

  private async validateSubscription(subscriptionId?: string) {
    if (!subscriptionId) return;

    const subscriptionExists = await this.database.findUnique(
      'subscription_types',
      {
        where: { subscription_type_id: subscriptionId }, // Changed table and column
      },
    );

    if (!subscriptionExists) {
      throw new ConflictException(
        'Subscription with the given ID does not exist',
      );
    }
  }

  private async validateManger(managerId?: string) {
    if (!managerId) return;

    const manager = await this.database.findUnique('users', {
      where: { user_id: managerId, deleted_at: null },
      include: { role: true },
    });

    if (!manager) {
      throw new ConflictException(
        `Manager user not found with ID: ${managerId}`,
      );
    }

    // Get the role to check if it's customer success
    const role = manager.role_id
      ? await this.database.findUnique('roles', {
          where: { role_id: manager.role_id },
        })
      : null;

    if (role?.name !== SYSTEM_ROLES.CUSTOMER_SUCCESS) {
      throw new ConflictException(
        'Manager user must have a customer success role',
      );
    }

    // Note: With the new customer_success_owned_customers table,
    // CS reps can be assigned to multiple customers, so we no longer
    // need to check for existing assignments and throw an error
  }

  private async validateOwner(ownerId?: string) {
    if (!ownerId) return;

    const owner = await this.database.findUnique('users', {
      where: { user_id: ownerId, deleted_at: null },
      include: { role: true },
    });

    if (!owner) {
      throw new ConflictException(`Owner user not found with ID: ${ownerId}`);
    }

    if (isPublicEmailDomain(owner.email)) {
      throw new ConflictException(
        'Owner email cannot be a public email domain',
      );
    }

    // Get the role to check
    const role = owner.role_id
      ? await this.database.findUnique('roles', {
          where: { role_id: owner.role_id },
        })
      : null;

    if (role?.name === SYSTEM_ROLES.SYSTEM_ADMINISTRATOR) {
      throw new ConflictException(
        'Owner user cannot be a system administrator. Please assign a different user as the owner.',
      );
    } else if (role?.name === SYSTEM_ROLES.CUSTOMER_SUCCESS) {
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
