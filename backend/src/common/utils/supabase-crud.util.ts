/**
 * CRUD Operation Utilities for Supabase Client
 * Provides interface for common database operations
 */

import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TableNames,
  TableType,
  PaginatedResult,
  PaginationOptions,
  OrderDirection,
} from '@/common/types';

// Where condition value types
type WhereValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | {
      contains?: string;
      startsWith?: string;
      endsWith?: string;
      in?: (string | number)[];
      gt?: string | number;
      gte?: string | number;
      lt?: string | number;
      lte?: string | number;
      not?: string | number | null | { in?: (string | number)[] };
      ilike?: string; // Case-insensitive LIKE pattern matching
      like?: string; // Case-sensitive LIKE pattern matching
    };

// Where clause type - covers most common query patterns

export interface WhereClause {
  [key: string]: WhereValue | WhereClause[] | undefined;
  OR?: WhereClause[];
  AND?: WhereClause[];
}

/**
 * Error handling utility for Supabase responses
 */
export function handleSupabaseError(
  error: unknown,
  operation: string = 'Database operation',
): never {
  if (!error) return undefined as never;

  console.error(`${operation} failed:`, error);

  // Handle specific PostgreSQL error codes
  const errorObj = error as { code?: string; message?: string };
  switch (errorObj.code) {
    case 'PGRST116': // No rows found
      throw new NotFoundException('Resource not found');
    case '23505': // Unique constraint violation
      throw new ConflictException('Resource already exists');
    case '23503': // Foreign key constraint violation
      throw new ConflictException('Referenced resource does not exist');
    case '23514': // Check constraint violation
      throw new ConflictException('Invalid data provided');
    case 'PGRST301': // Ambiguous column reference
      throw new InternalServerErrorException('Ambiguous query');
    default:
      throw new InternalServerErrorException(
        errorObj.message || `${operation} failed`,
      );
  }
}

/**
 * Safe query executor that handles errors consistently
 */
export async function executeQuery<T>(
  queryPromise: Promise<{ data: T | null; error: unknown }>,
  operation: string = 'Query',
): Promise<T> {
  const { data, error } = await queryPromise;

  if (error) {
    handleSupabaseError(error, operation);
  }

  if (data === null) {
    throw new NotFoundException('Resource not found');
  }

  return data;
}

/**
 * Safe array query executor
 */
export async function executeArrayQuery<T>(
  queryPromise: Promise<{ data: T[] | null; error: unknown; count?: number }>,
  operation: string = 'Array query',
): Promise<{ data: T[]; count?: number }> {
  const { data, error, count } = await queryPromise;

  if (error) {
    handleSupabaseError(error, operation);
  }

  return { data: data || [], count };
}

/**
 * CRUD Operations Class
 * Provides methods for common database operations.
 * Uses controlled any types for Supabase internals but maintains type safety at API level.
 */
export class SupabaseCRUD {
  constructor(private client: SupabaseClient) {}

  /**
   * Find many records
   * Supports relations via select parameter with Supabase foreign table syntax
   */
  async findMany<T extends TableNames>(
    tableName: T,
    options?: {
      select?: string;
      where?: WhereClause;
      orderBy?: { field: string; direction: OrderDirection }[];
      take?: number;
      skip?: number;
      include?: Record<
        string,
        boolean | { select?: string; where?: WhereClause }
      >;
    },
  ): Promise<TableType<T>[]> {
    // Build select string with relations if include is provided
    const selectString = this.buildSelectStringWithMappings(
      tableName,
      options?.select,
      options?.include,
    );
    let query: any = this.client.from(tableName).select(selectString);

    // Apply where conditions
    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    // Apply ordering
    if (options?.orderBy) {
      for (const order of options.orderBy) {
        query = query.order(order.field, {
          ascending: order.direction === 'asc',
        });
      }
    }

    // Apply pagination
    if (options?.skip !== undefined || options?.take !== undefined) {
      const start = options.skip || 0;
      const end = options.take ? start + options.take - 1 : undefined;
      if (end !== undefined) {
        query = query.range(start, end);
      }
    }

    const { data } = await executeArrayQuery(query, `Find many ${tableName}`);
    return data as TableType<T>[];
  }

  /**
   * Find unique record
   * Supports relations via select parameter or include option
   */
  async findUnique<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
      select?: string;
      include?: Record<
        string,
        boolean | { select?: string; where?: WhereClause }
      >;
    },
  ): Promise<TableType<T> | null> {
    // Build select string with relations if include is provided
    const selectString = this.buildSelectStringWithMappings(
      tableName,
      options.select,
      options.include,
    );
    let query: any = this.client.from(tableName).select(selectString);

    // Apply where conditions
    query = this.applyWhereConditions(query, options.where);

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      handleSupabaseError(error, `Find unique ${tableName}`);
    }

    return (data as TableType<T>) || null;
  }

  /**
   * Find first record
   */
  async findFirst<T extends TableNames>(
    tableName: T,
    options?: {
      where?: WhereClause;
      select?: string;
      orderBy?: { field: string; direction: OrderDirection }[];
    },
  ): Promise<TableType<T> | null> {
    let query: any = this.client.from(tableName).select(options?.select || '*');

    // Apply where conditions
    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    // Apply ordering
    if (options?.orderBy) {
      for (const order of options.orderBy) {
        query = query.order(order.field, {
          ascending: order.direction === 'asc',
        });
      }
    }

    // Limit to 1 record
    query = query.limit(1);

    const { data } = await executeArrayQuery(query, `Find first ${tableName}`);
    return (data[0] as TableType<T>) || null;
  }

  /**
   * Create record
   */
  async create<T extends TableNames>(
    tableName: T,
    options: {
      data: Partial<TableType<T>>;
      select?: string;
    },
  ): Promise<TableType<T>> {
    const query = this.client
      .from(tableName)
      .insert(options.data)
      .select(options.select || '*')
      .single();

    return executeQuery(
      query as unknown as Promise<{
        data: TableType<T> | null;
        error: unknown;
      }>,
      `Create ${tableName}`,
    );
  }

  /**
   * Update record
   */
  async update<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
      data: Partial<TableType<T>>;
      select?: string;
    },
  ): Promise<TableType<T>> {
    let query: any = this.client.from(tableName).update(options.data);

    // Apply where conditions
    query = this.applyWhereConditions(query, options.where);

    const finalQuery = query.select(options.select || '*').single();

    return executeQuery(finalQuery, `Update ${tableName}`);
  }

  /**
   * Update many records
   */
  async updateMany<T extends TableNames>(
    tableName: T,
    options: {
      where?: WhereClause;
      data: Partial<TableType<T>>;
    },
  ): Promise<{ count: number }> {
    let query: any = this.client.from(tableName).update(options.data);

    // Apply where conditions
    if (options.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    const { count } = await executeArrayQuery(
      query.select('id', { count: 'exact' }),
      `Update many ${tableName}`,
    );

    return { count: count || 0 };
  }

  /**
   * Delete record
   */
  async delete<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
    },
  ): Promise<TableType<T>> {
    let query: any = this.client.from(tableName).delete();

    // Apply where conditions
    query = this.applyWhereConditions(query, options.where);

    const finalQuery = query.select('*').single();

    return executeQuery(finalQuery, `Delete ${tableName}`);
  }

  /**
   * Delete many records
   */
  async deleteMany<T extends TableNames>(
    tableName: T,
    options?: {
      where?: WhereClause;
    },
  ): Promise<{ count: number }> {
    let query: any = this.client.from(tableName).delete();

    // Apply where conditions
    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    const { count } = await executeArrayQuery(
      query.select('id', { count: 'exact' }),
      `Delete many ${tableName}`,
    );

    return { count: count || 0 };
  }

  /**
   * Count records
   */
  async count<T extends TableNames>(
    tableName: T,
    options?: {
      where?: WhereClause;
    },
  ): Promise<number> {
    let query: any = this.client
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Apply where conditions
    if (options?.where) {
      query = this.applyWhereConditions(query, options.where);
    }

    const { count, error } = await query;

    if (error) {
      handleSupabaseError(error, `Count ${tableName}`);
    }

    return count || 0;
  }

  /**
   * Upsert record
   */
  async upsert<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
      create: Partial<TableType<T>>;
      update: Partial<TableType<T>>;
      select?: string;
    },
  ): Promise<TableType<T>> {
    // First try to find existing record
    const existing = await this.findUnique(tableName, {
      where: options.where,
      select: 'id',
    });

    if (existing) {
      // Update existing record
      return this.update(tableName, {
        where: options.where,
        data: options.update,
        select: options.select,
      });
    } else {
      // Create new record
      return this.create(tableName, {
        data: { ...options.create, ...options.where },
        select: options.select,
      });
    }
  }

  /**
   * Paginated query with proper typing
   */
  async paginate<T extends TableNames>(
    tableName: T,
    paginationOptions: PaginationOptions,
    queryOptions?: {
      where?: WhereClause;
      select?: string;
      orderBy?: { field: string; direction: OrderDirection }[];
    },
  ): Promise<PaginatedResult<TableType<T>>> {
    const { page, per_page } = paginationOptions;
    const offset = (page - 1) * per_page;

    // Build base query for data

    let dataQuery: any = this.client
      .from(tableName)
      .select(queryOptions?.select || '*');

    // Build count query

    let countQuery: any = this.client
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Apply where conditions to both queries
    if (queryOptions?.where) {
      dataQuery = this.applyWhereConditions(dataQuery, queryOptions.where);
      countQuery = this.applyWhereConditions(countQuery, queryOptions.where);
    }

    // Apply ordering to data query
    if (queryOptions?.orderBy) {
      for (const order of queryOptions.orderBy) {
        dataQuery = dataQuery.order(order.field, {
          ascending: order.direction === 'asc',
        });
      }
    }

    // Apply pagination to data query
    dataQuery = dataQuery.range(offset, offset + per_page - 1);

    // Execute both queries
    const [{ data }, { count }] = await Promise.all([
      executeArrayQuery(dataQuery, `Paginate ${tableName} data`),
      executeArrayQuery(countQuery, `Paginate ${tableName} count`),
    ]);

    return {
      data: data as TableType<T>[],
      meta: {
        total: count || 0,
        page,
        per_page,
        total_pages: Math.ceil((count || 0) / per_page),
      },
    };
  }

  /**
   * Apply where conditions to a query
   * Handles common where patterns
   */

  private applyWhereConditions(query: any, where: WhereClause): any {
    for (const [key, value] of Object.entries(where)) {
      if (key === 'OR') {
        // Handle OR conditions
        if (Array.isArray(value)) {
          const orConditions = value
            .map((condition) => {
              return Object.entries(condition)
                .map(([k, v]) => {
                  if (v === null) {
                    // Handle null values with .is.null syntax
                    return `${k}.is.null`;
                  } else if (Array.isArray(v)) {
                    // Handle array values as 'in' operation
                    return `${k}.in.(${v.join(',')})`;
                  } else if (
                    typeof v === 'object' &&
                    v !== null &&
                    !Array.isArray(v)
                  ) {
                    return this.buildConditionString(
                      k,
                      v as Record<string, unknown>,
                    );
                  }
                  // Handle primitive values (string, number, boolean)
                  const primitiveValue =
                    typeof v === 'string' ||
                    typeof v === 'number' ||
                    typeof v === 'boolean'
                      ? v
                      : (() => {
                          console.warn(
                            `Unexpected value type in OR condition: ${typeof v}`,
                          );
                          return '';
                        })();
                  return `${k}.eq.${primitiveValue}`;
                })
                .join(',');
            })
            .join(',');
          query = query.or(orConditions);
        }
      } else if (key === 'AND') {
        // Handle AND conditions
        if (Array.isArray(value)) {
          for (const condition of value) {
            query = this.applyWhereConditions(query, condition as WhereClause);
          }
        }
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Handle complex conditions (contains, in, etc.)
        query = this.applyComplexCondition(
          query,
          key,
          value as Record<string, unknown>,
        );
      } else if (Array.isArray(value)) {
        // Handle array values (assumed to be 'in' operation)
        query = query.in(key, value);
      } else if (value === null) {
        // Handle null values
        query = query.is(key, null);
      } else {
        // Handle simple equality
        query = query.eq(key, value);
      }
    }
    return query;
  }

  /**
   * Apply complex conditions like contains, in, gt, etc.
   */
  private applyComplexCondition(
    query: any,
    field: string,
    condition: Record<string, unknown>,
  ): any {
    for (const [operator, value] of Object.entries(condition)) {
      switch (operator) {
        case 'contains':
          query = query.ilike(field, `%${String(value)}%`);
          break;
        case 'startsWith':
          query = query.ilike(field, `${String(value)}%`);
          break;
        case 'endsWith':
          query = query.ilike(field, `%${String(value)}`);
          break;
        case 'in':
          if (Array.isArray(value)) {
            query = query.in(field, value);
          }
          break;
        case 'gt':
          query = query.gt(field, value);
          break;
        case 'gte':
          query = query.gte(field, value);
          break;
        case 'lt':
          query = query.lt(field, value);
          break;
        case 'lte':
          query = query.lte(field, value);
          break;
        case 'not':
          if (value === null) {
            query = query.not(field, 'is', null);
          } else if (
            typeof value === 'object' &&
            value !== null &&
            'in' in value
          ) {
            // Handle not.in operator: field.not.in.(value1,value2)
            query = query.not(field, 'in', value.in as (string | number)[]);
          } else {
            query = query.neq(field, value);
          }
          break;
        default:
          console.warn(`Unsupported condition operator: ${operator}`);
      }
    }
    return query;
  }

  /**
   * Build condition string for OR queries
   */
  private buildConditionString(
    field: string,
    condition: Record<string, unknown>,
  ): string {
    for (const [operator, value] of Object.entries(condition)) {
      switch (operator) {
        case 'contains':
          return `${field}.ilike.%${String(value)}%`;
        case 'in':
          return `${field}.in.(${Array.isArray(value) ? value.join(',') : String(value)})`;
        case 'not':
          // Handle not operator with nested conditions
          if (typeof value === 'object' && value !== null && 'in' in value) {
            const inValues = (value as { in?: (string | number)[] }).in;
            return `${field}.not.in.(${Array.isArray(inValues) ? inValues.join(',') : String(inValues)})`;
          } else if (value === null) {
            return `${field}.not.is.null`;
          } else if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            return `${field}.neq.${value}`;
          }
          console.warn(
            `Unexpected value type in not condition: ${typeof value}`,
          );
          return `${field}.neq.`;
        case 'gt':
          return `${field}.gt.${String(value)}`;
        case 'gte':
          return `${field}.gte.${String(value)}`;
        case 'lt':
          return `${field}.lt.${String(value)}`;
        case 'lte':
          return `${field}.lte.${String(value)}`;
        default: {
          // Handle primitive values
          const primitiveValue =
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
              ? value
              : (() => {
                  console.warn(
                    `Unexpected value type in condition: ${typeof value}`,
                  );
                  return '';
                })();
          return `${field}.eq.${primitiveValue}`;
        }
      }
    }
    return `${field}.eq.unknown`;
  }

  /**
   * Helper method to build common relation patterns
   * Maps relation names to Supabase foreign key patterns
   */
  private getRelationMapping(tableName: string): Record<string, string> {
    // Common relation mappings based on your schema
    const relationMappings: Record<string, Record<string, string>> = {
      users: {
        customer: 'customers!customer_id',
        role: 'roles!role_id',
        manager: 'managers!manager_id',
        ownedCustomer: 'customers!owner_id',
        articles: 'articles!created_by',
        notifications: 'notifications!user_id',
        sentNotifications: 'notifications!sender_id',
        teamMembers: 'team_members!user_id',
        customerSuccessOwnedCustomers: 'customer_success_owned_customers!user_id',
      },
      customers: {
        subscription: 'subscriptions!subscription_id',
        manager: 'managers!manager_id',
        owner: 'users!owner_id',
        customerSuccess: 'users!customer_success_id',
        users: 'users!customer_id',
        articles: 'articles!customer_id',
        notifications: 'notifications!customer_id',
        notificationTemplates: 'notification_templates!customer_id',
        teams: 'teams!customer_id',
        customerSuccessOwnedCustomers: 'customer_success_owned_customers!customer_id',
        subscriptions: 'subscriptions!customer_id',
      },
      teams: {
        customer: 'customers!customer_id',
        manager: 'users!manager_id',
        teamMembers: 'team_members!team_id',
      },
      team_members: {
        team: 'teams!team_id',
        user: 'users!user_id',
      },
      customer_success_owned_customers: {
        user: 'users!user_id',
        customer: 'customers!customer_id',
      },
      subscriptions: {
        customer: 'customers!customer_id',
      },
      roles: {
        users: 'users!role_id',
        rolePermissions: 'role_permissions!role_id',
      },
      role_permissions: {
        role: 'roles!role_id',
        permission: 'permissions!permission_id',
      },
      articles: {
        category: 'article_categories!category_id',
        creator: 'users!created_by',
        customer: 'customers!customer_id',
      },
      notifications: {
        user: 'users!user_id',
        sender: 'users!sender_id',
        customer: 'customers!customer_id',
        template: 'notification_templates!template_id',
      },
      // Add more mappings as needed
    };

    return relationMappings[tableName] || {};
  }

  /**
   * Enhanced buildSelectString that uses relation mappings
   */
  private buildSelectStringWithMappings(
    tableName: string,
    select?: string,
    include?: Record<
      string,
      boolean | { select?: string; where?: WhereClause }
    >,
  ): string {
    // If explicit select is provided, use it as-is
    if (select) {
      return select;
    }

    // If no include, return all fields
    if (!include) {
      return '*';
    }

    // Get relation mappings for this table
    const relationMappings = this.getRelationMapping(tableName);
    const fields = ['*']; // Start with all base fields

    for (const [relationName, relationConfig] of Object.entries(include)) {
      const mappedRelation = relationMappings[relationName];

      if (!mappedRelation) {
        console.warn(
          `Unknown relation '${relationName}' for table '${tableName}'. Using direct mapping.`,
        );
        // Fallback to direct mapping
        fields.push(`${relationName}(*)`);
        continue;
      }

      if (relationConfig === true) {
        // Simple include: customers!customer_id(*)
        fields.push(`${mappedRelation}(*)`);
      } else if (typeof relationConfig === 'object') {
        // Complex include with select
        const relationSelect = relationConfig.select || '*';
        fields.push(`${mappedRelation}(${relationSelect})`);

        if (relationConfig.where) {
          console.warn(
            `Where clauses in relations are not supported by Supabase. Relation: ${relationName}`,
          );
        }
      }
    }

    return fields.join(', ');
  }
}
