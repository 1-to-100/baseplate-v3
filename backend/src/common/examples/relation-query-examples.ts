/**
 * Examples of Relation Query Patterns
 * Demonstrates how to use the enhanced CRUD utility with relations
 */

import { DatabaseService } from '@/common/database/database.service';

// Example usage patterns for relations
export class RelationQueryExamples {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Example 1: Simple relation include
   */
  async getUserWithCustomer(userId: number) {
    return this.database.findUnique('users', {
      where: { id: userId },
      include: {
        customer: true, // Will generate: customers!customer_id(*)
      },
    });
  }

  /**
   * Example 2: Complex relation with custom select
   */
  async getUserWithCustomerDetails(userId: number) {
    return this.database.findUnique('users', {
      where: { id: userId },
      include: {
        customer: {
          select: 'id, name, email', // Will generate: customers!customer_id(id, name, email)
        },
      },
    });
  }

  /**
   * Example 3: Multiple relations
   */
  async getUserWithAllRelations(userId: number) {
    return this.database.findUnique('users', {
      where: { id: userId },
      include: {
        customer: true, // customers!customer_id(*)
        role: true, // roles!role_id(*)
        manager: true, // managers!manager_id(*)
      },
    });
  }

  /**
   * Example 4: Reverse relation (one-to-many)
   */
  async getCustomerWithUsers(customerId: number) {
    return this.database.findUnique('customers', {
      where: { id: customerId },
      include: {
        users: true, // users!customer_id(*)
      },
    });
  }

  /**
   * Example 5: Complex query with relations and filtering
   */
  async getActiveUsersWithCustomers() {
    return this.database.findMany('users', {
      where: {
        status: 'active',
        deleted_at: null,
      },
      include: {
        customer: true,
      },
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      take: 10,
    });
  }

  /**
   * Example 6: Raw Supabase select for complex relations
   */
  async getArticleWithAllRelations(articleId: number) {
    // When you need very specific relation queries, you can use raw select:
    return this.database.findUnique('articles', {
      where: { id: articleId },
      select: `
        *,
        article_categories!category_id(id, name, about),
        users!created_by(id, first_name, last_name, email),
        customers!customer_id(id, name, domain)
      `,
    });
  }

  /**
   * Example 7: Nested relations (limited by Supabase)
   */
  async getCustomerWithUsersAndRoles(customerId: number) {
    // Note: Supabase doesn't support nested relations in the same way
    // You can select the fields directly:
    return this.database.findUnique('customers', {
      where: { id: customerId },
      select: `
        *,
        users!customer_id(
          *,
          roles!role_id(id, name, description)
        )
      `,
    });
  }

  /**
   * Example 8: Search with relations
   */
  async searchUsersWithCustomers(searchTerm: string) {
    return this.database.findMany('users', {
      where: {
        OR: [
          { first_name: { contains: searchTerm } },
          { last_name: { contains: searchTerm } },
          { email: { contains: searchTerm } },
        ],
        deleted_at: null,
      } as any,
      include: {
        customer: {
          select: 'id, name, domain',
        },
        role: {
          select: 'id, name',
        },
      },
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    });
  }
}
