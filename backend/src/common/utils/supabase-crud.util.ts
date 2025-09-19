/**
 * CRUD Operation Utilities for Supabase Client
 * Provides Prisma-like interface for common database operations
 *
 * Uses pragmatic typing approach: type-safe API with controlled any types
 * for Supabase's complex internal query builder types.
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
      not?: string | number | null;
    };

// Where clause type - covers most common Prisma-like patterns
export type WhereClause = {
  [key: string]: WhereValue;
} & {
  OR?: WhereClause[];
  AND?: WhereClause[];
};

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
 * Provides Prisma-like methods for common database operations.
 * Uses controlled any types for Supabase internals but maintains type safety at API level.
 */
export class SupabaseCRUD {
  constructor(private client: SupabaseClient) {}

  /**
   * Find many records - equivalent to Prisma's findMany
   */
  async findMany<T extends TableNames>(
    tableName: T,
    options?: {
      select?: string;
      where?: WhereClause;
      orderBy?: { field: string; direction: OrderDirection }[];
      take?: number;
      skip?: number;
    },
  ): Promise<TableType<T>[]> {
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
   * Find unique record - equivalent to Prisma's findUnique
   */
  async findUnique<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
      select?: string;
    },
  ): Promise<TableType<T> | null> {
    let query: any = this.client.from(tableName).select(options.select || '*');

    // Apply where conditions
    query = this.applyWhereConditions(query, options.where);

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      handleSupabaseError(error, `Find unique ${tableName}`);
    }

    return (data as TableType<T>) || null;
  }

  /**
   * Find first record - equivalent to Prisma's findFirst
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
   * Create record - equivalent to Prisma's create
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
   * Update record - equivalent to Prisma's update
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
   * Update many records - equivalent to Prisma's updateMany
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
   * Delete record - equivalent to Prisma's delete
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
   * Delete many records - equivalent to Prisma's deleteMany
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
   * Count records - equivalent to Prisma's count
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
   * Upsert record - equivalent to Prisma's upsert
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
   * Handles common Prisma-like where patterns
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
                  if (
                    typeof v === 'object' &&
                    v !== null &&
                    !Array.isArray(v)
                  ) {
                    return this.buildConditionString(
                      k,
                      v as Record<string, unknown>,
                    );
                  }
                  return `${k}.eq.${String(v)}`;
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
        case 'gt':
          return `${field}.gt.${String(value)}`;
        case 'gte':
          return `${field}.gte.${String(value)}`;
        case 'lt':
          return `${field}.lt.${String(value)}`;
        case 'lte':
          return `${field}.lte.${String(value)}`;
        default:
          return `${field}.eq.${String(value)}`;
      }
    }
    return `${field}.eq.unknown`;
  }
}
