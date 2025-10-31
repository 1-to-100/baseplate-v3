import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import type {
  CustomerSuccessOwnedCustomer,
  CreateCustomerSuccessOwnedCustomerInput,
} from '@/common/types/database.types';

@Injectable()
export class CustomerSuccessOwnedCustomersService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Get all customer success owned customer assignments
   * Optionally filter by userId or customerId
   */
  async findAll(filters?: {
    userId?: string;
    customerId?: string;
  }): Promise<CustomerSuccessOwnedCustomer[]> {
    const where: any = {};

    if (filters?.userId) {
      where.user_id = filters.userId;
    }

    if (filters?.customerId) {
      where.customer_id = filters.customerId;
    }

    const assignments = await this.database.findMany(
      'customer_success_owned_customers',
      {
        where,
        include: {
          users: {
            select: 'user_id, full_name, email, avatar_url',
          },
          customers: {
            select: 'customer_id, name, email_domain, lifecycle_stage',
          },
        },
      },
    );

    return assignments;
  }

  /**
   * Get a specific assignment by ID
   */
  async findOne(id: string): Promise<CustomerSuccessOwnedCustomer> {
    const assignment = await this.database.findUnique(
      'customer_success_owned_customers',
      {
        where: { customer_success_owned_customer_id: id },
        include: {
          users: {
            select: 'user_id, full_name, email, avatar_url',
          },
          customers: {
            select: 'customer_id, name, email_domain, lifecycle_stage',
          },
        },
      },
    );

    if (!assignment) {
      throw new NotFoundException(
        `Customer success assignment with ID ${id} not found`,
      );
    }

    return assignment;
  }

  /**
   * Get all customers assigned to a specific CS rep
   */
  async getCustomersByCSRep(
    userId: string,
  ): Promise<CustomerSuccessOwnedCustomer[]> {
    return this.findAll({ userId });
  }

  /**
   * Get all CS reps assigned to a specific customer
   */
  async getCSRepsByCustomer(
    customerId: string,
  ): Promise<CustomerSuccessOwnedCustomer[]> {
    return this.findAll({ customerId });
  }

  /**
   * Assign a CS rep to a customer
   */
  async create(
    data: CreateCustomerSuccessOwnedCustomerInput,
  ): Promise<CustomerSuccessOwnedCustomer> {
    // Validate that user exists and is a customer success rep
    await this.validateCSRep(data.user_id);

    // Validate that customer exists
    await this.validateCustomer(data.customer_id);

    // Check if assignment already exists
    const existing = await this.database.findFirst(
      'customer_success_owned_customers',
      {
        where: {
          user_id: data.user_id,
          customer_id: data.customer_id,
        },
      },
    );

    if (existing) {
      throw new ConflictException(
        `CS rep is already assigned to this customer`,
      );
    }

    // Create the assignment
    const assignment = await this.database.create(
      'customer_success_owned_customers',
      {
        data,
      },
    );

    return assignment;
  }

  /**
   * Remove a CS rep assignment
   */
  async remove(id: string): Promise<void> {
    const assignment = await this.database.findUnique(
      'customer_success_owned_customers',
      {
        where: { customer_success_owned_customer_id: id },
      },
    );

    if (!assignment) {
      throw new NotFoundException(
        `Customer success assignment with ID ${id} not found`,
      );
    }

    await this.database.delete('customer_success_owned_customers', {
      where: { customer_success_owned_customer_id: id },
    });
  }

  /**
   * Remove assignment by userId and customerId
   */
  async removeByUserAndCustomer(
    userId: string,
    customerId: string,
  ): Promise<void> {
    const assignment = await this.database.findFirst(
      'customer_success_owned_customers',
      {
        where: {
          user_id: userId,
          customer_id: customerId,
        },
      },
    );

    if (!assignment) {
      throw new NotFoundException(
        `No assignment found for this CS rep and customer`,
      );
    }

    await this.database.delete('customer_success_owned_customers', {
      where: {
        customer_success_owned_customer_id:
          assignment.customer_success_owned_customer_id,
      },
    });
  }

  /**
   * Check if a CS rep is assigned to a customer
   */
  async isAssigned(userId: string, customerId: string): Promise<boolean> {
    const assignment = await this.database.findFirst(
      'customer_success_owned_customers',
      {
        where: {
          user_id: userId,
          customer_id: customerId,
        },
      },
    );

    return !!assignment;
  }

  /**
   * Validate that the user is a customer success representative
   */
  private async validateCSRep(userId: string): Promise<void> {
    const user = await this.database.findUnique('users', {
      where: { user_id: userId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get the user's role
    const role = user.role_id
      ? await this.database.findUnique('roles', {
          where: { role_id: user.role_id },
        })
      : null;

    if (role?.name !== 'customer_success') {
      throw new ConflictException(
        'User must have a customer success role to be assigned to customers',
      );
    }
  }

  /**
   * Validate that the customer exists
   */
  private async validateCustomer(customerId: string): Promise<void> {
    const customer = await this.database.findUnique('customers', {
      where: { customer_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }
  }
}
