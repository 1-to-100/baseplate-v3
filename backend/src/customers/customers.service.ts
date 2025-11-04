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
import { isPublicEmailDomain } from '@/common/helpers/public-email-domains';
import { parseUserName } from '@/common/helpers/schema-mappers';
import { CustomerSuccessOwnedCustomersService } from '@/customer-success-owned-customers/customer-success-owned-customers.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly supabaseService: SupabaseService,
    private readonly csOwnedCustomersService: CustomerSuccessOwnedCustomersService,
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
    const { name, subscriptionId, ownerId, customerSuccessIds } =
      createCustomerDto;

    const owner = await this.database.findUnique('users', {
      where: { user_id: ownerId, deleted_at: null },
    });

    await this.validateOwner(ownerId);
    await this.validateCustomerOwner(owner!.email, ownerId, name);
    await this.validateSubscription(subscriptionId);

    // Validate all customer success users if provided
    if (customerSuccessIds && customerSuccessIds.length > 0) {
      for (const csId of customerSuccessIds) {
        await this.validateCSUser(csId);
      }
    }

    const customer = await this.database.create('customers', {
      data: {
        name,
        subscription_type_id: subscriptionId,
        email_domain: getDomainFromEmail(owner!.email),
        owner_id: ownerId,
        lifecycle_stage: CustomerLifecycleStage.ONBOARDING,
        active: true,
      },
    });

    await this.database.update('users', {
      where: { user_id: ownerId, deleted_at: null },
      data: { customer_id: customer.customer_id },
    });

    // Create customer success assignments if provided
    if (customerSuccessIds && customerSuccessIds.length > 0) {
      for (const csId of customerSuccessIds) {
        await this.csOwnedCustomersService.create({
          user_id: csId,
          customer_id: customer.customer_id,
        });
      }
    }

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

    let csFilteredCustomerIds: string[] | undefined;

    // If filtering by customerSuccessId or managerId, get customer IDs from the new table
    const csUserIds = [...(managerId || []), ...(customerSuccessId || [])];
    if (csUserIds.length > 0) {
      // Get all assignments for these CS users
      const assignments = await Promise.all(
        csUserIds.map((userId) =>
          this.csOwnedCustomersService.getCustomersByCSRep(userId),
        ),
      );

      // Flatten and get unique customer IDs
      const customerIds = [
        ...new Set(
          assignments.flat().map((assignment: any) => assignment.customer_id),
        ),
      ];

      csFilteredCustomerIds = customerIds;
    }

    const where: any = {
      ...(id && { customer_id: { in: id } }),
      ...(csFilteredCustomerIds && {
        customer_id: { in: csFilteredCustomerIds },
      }),
      ...(subscriptionId && { subscription_type_id: { in: subscriptionId } }),
      // Map status to lifecycle_stage
      ...(status && {
        lifecycle_stage: { in: status },
      }),
      ...(search && {
        OR: [
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

        // Get customer success users from the new table
        const csAssignments =
          await this.csOwnedCustomersService.getCSRepsByCustomer(
            customer.customer_id,
          );

        // Map CS assignments to the format needed for the API
        const customerSuccessUsers = csAssignments.map((assignment: any) => ({
          id: assignment.user_id,
          name: assignment.users?.full_name,
          email: assignment.users?.email,
        }));

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
              { customer_id: customer.customer_id, deleted_at: null },
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
          customerSuccess:
            customerSuccessUsers.length > 0 ? customerSuccessUsers : null,
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

    // Get customer success users from the new table
    const csAssignments =
      await this.csOwnedCustomersService.getCSRepsByCustomer(
        customer.customer_id,
      );

    // Map CS assignments to the format needed for the API
    const customerSuccessUsers = csAssignments.map((assignment: any) => ({
      id: assignment.user_id,
      name: assignment.users?.full_name,
      email: assignment.users?.email,
    }));

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

    // Parse owner name
    const ownerName = ownerUser?.full_name
      ? parseUserName(ownerUser.full_name)
      : null;

    return {
      id: customer.customer_id,
      name: customer.name,
      email: ownerUser?.email || '',
      status: customer.lifecycle_stage, // Map for API
      customerSuccess:
        customerSuccessUsers.length > 0 ? customerSuccessUsers : null,
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

  async update(id: string, updateCustomerDto: CreateCustomerDto) {
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: id }, // Changed from id
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const { name, subscriptionId, ownerId, customerSuccessIds } =
      updateCustomerDto;
    await this.validateSubscription(subscriptionId);

    // Handle customer success assignments if provided
    if (customerSuccessIds !== undefined) {
      // Validate all CS users
      for (const userId of customerSuccessIds) {
        await this.validateCSUser(userId);
      }

      // Get existing assignments
      const existingAssignments =
        await this.csOwnedCustomersService.getCSRepsByCustomer(id);
      const existingUserIds = existingAssignments.map((a: any) => a.user_id);

      // Determine which assignments to add and remove
      const toAdd = customerSuccessIds.filter(
        (userId) => !existingUserIds.includes(userId),
      );
      const toRemove = existingUserIds.filter(
        (userId: string) => !customerSuccessIds.includes(userId),
      );

      // Remove old assignments (do NOT modify user's customer_id)
      for (const userId of toRemove) {
        await this.csOwnedCustomersService.removeByUserAndCustomer(userId, id);
      }

      // Add new assignments
      for (const userId of toAdd) {
        // Create assignment
        await this.csOwnedCustomersService.create({
          user_id: userId,
          customer_id: id,
        });

        // If user has no customer_id, set it
        const user = await this.database.findUnique('users', {
          where: { user_id: userId, deleted_at: null },
        });

        if (user && !user.customer_id) {
          await this.database.update('users', {
            where: { user_id: userId, deleted_at: null },
            data: { customer_id: id },
          });
        }
      }
    }

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
      OR: [{ email_domain: name }, { owner_id: ownerId }],
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

  private async validateCSUser(userId?: string) {
    if (!userId) return;

    const user = await this.database.findUnique('users', {
      where: { user_id: userId, deleted_at: null },
      include: { role: true },
    });

    if (!user) {
      throw new ConflictException(
        `Customer success user not found with ID: ${userId}`,
      );
    }

    // Get the role to check if it's customer success
    const role = user.role_id
      ? await this.database.findUnique('roles', {
          where: { role_id: user.role_id },
        })
      : null;

    if (role?.name !== SYSTEM_ROLES.CUSTOMER_SUCCESS) {
      throw new ConflictException('User must have a customer success role');
    }
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

  /**
   * Add a customer success user assignment to a customer
   */
  async addCustomerSuccessUser(customerId: string, userId: string) {
    // Validate customer exists
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Validate CS user
    await this.validateCSUser(userId);

    // Create the assignment
    return await this.csOwnedCustomersService.create({
      user_id: userId,
      customer_id: customerId,
    });
  }

  /**
   * Remove a customer success user assignment from a customer
   */
  async removeCustomerSuccessUser(customerId: string, userId: string) {
    // Validate customer exists
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Remove the assignment
    await this.csOwnedCustomersService.removeByUserAndCustomer(
      userId,
      customerId,
    );
  }

  /**
   * Get all customer success users assigned to a customer
   */
  async getCustomerSuccessUsers(customerId: string) {
    // Validate customer exists
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const csAssignments =
      await this.csOwnedCustomersService.getCSRepsByCustomer(customerId);

    return csAssignments.map((assignment: any) => ({
      id: assignment.user_id,
      name: assignment.users?.full_name,
      email: assignment.users?.email,
      avatarUrl: assignment.users?.avatar_url,
    }));
  }

  /**
   * Update customer success assignments for a customer
   * Replaces all existing assignments with the new list
   */
  async updateCustomerSuccessUsers(customerId: string, userIds: string[]) {
    // Validate customer exists
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Validate all CS users
    for (const userId of userIds) {
      await this.validateCSUser(userId);
    }

    // Get existing assignments
    const existingAssignments =
      await this.csOwnedCustomersService.getCSRepsByCustomer(customerId);
    const existingUserIds = existingAssignments.map((a: any) => a.user_id);

    // Determine which assignments to add and remove
    const toAdd = userIds.filter((id) => !existingUserIds.includes(id));
    const toRemove = existingUserIds.filter(
      (id: string) => !userIds.includes(id),
    );

    // Remove old assignments
    for (const userId of toRemove) {
      await this.csOwnedCustomersService.removeByUserAndCustomer(
        userId,
        customerId,
      );
    }

    // Add new assignments
    for (const userId of toAdd) {
      await this.csOwnedCustomersService.create({
        user_id: userId,
        customer_id: customerId,
      });
    }

    return this.getCustomerSuccessUsers(customerId);
  }

  remove(id: number) {
    throw new ConflictException(
      `Delete operation with ${id} is not supported at the moment.`,
    );
  }
}
