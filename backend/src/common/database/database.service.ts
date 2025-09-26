import { Injectable, OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { SupabaseCRUD, executeQuery, handleSupabaseError, type WhereClause } from '@/common/utils/supabase-crud.util';
import type {
  TableNames,
  TableType,
  PaginatedResult,
  PaginationOptions,
  OrderDirection,
} from '@/common/types';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private client: SupabaseClient;
  private crud: SupabaseCRUD;

  constructor(private readonly supabaseService: SupabaseService) {}

  onModuleInit() {
    this.client = this.supabaseService.getClient();
    this.crud = new SupabaseCRUD(this.client);
  }

  // Expose the raw client for advanced operations
  getClient(): SupabaseClient {
    return this.client;
  }

  // Database table accessors - matches your Prisma schema
  get users() {
    return this.client.from('users');
  }

  get customers() {
    return this.client.from('customers');
  }

  get roles() {
    return this.client.from('roles');
  }

  get permissions() {
    return this.client.from('permissions');
  }

  get role_permissions() {
    return this.client.from('role_permissions');
  }

  get managers() {
    return this.client.from('managers');
  }

  get subscriptions() {
    return this.client.from('subscriptions');
  }

  get user_one_time_codes() {
    return this.client.from('user_one_time_codes');
  }

  get api_logs() {
    return this.client.from('api_logs');
  }

  get article_categories() {
    return this.client.from('article_categories');
  }

  get articles() {
    return this.client.from('articles');
  }

  get notifications() {
    return this.client.from('notifications');
  }

  get notification_templates() {
    return this.client.from('notification_templates');
  }

  // CRUD Operations - Prisma-like interface using SupabaseCRUD

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
      include?: Record<
        string,
        boolean | { select?: string; where?: WhereClause }
      >;
    }
  ): Promise<TableType<T>[]> {
    return this.crud.findMany(tableName, options);
  }

  /**
   * Find unique record - equivalent to Prisma's findUnique
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
    }
  ): Promise<TableType<T> | null> {
    return this.crud.findUnique(tableName, options);
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
    }
  ): Promise<TableType<T> | null> {
    return this.crud.findFirst(tableName, options);
  }

  /**
   * Create record - equivalent to Prisma's create
   */
  async create<T extends TableNames>(
    tableName: T,
    options: {
      data: Partial<TableType<T>>;
      select?: string;
    }
  ): Promise<TableType<T>> {
    return this.crud.create(tableName, options);
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
    }
  ): Promise<TableType<T>> {
    return this.crud.update(tableName, options);
  }

  /**
   * Update many records - equivalent to Prisma's updateMany
   */
  async updateMany<T extends TableNames>(
    tableName: T,
    options: {
      where?: WhereClause;
      data: Partial<TableType<T>>;
    }
  ): Promise<{ count: number }> {
    return this.crud.updateMany(tableName, options);
  }

  /**
   * Delete record - equivalent to Prisma's delete
   */
  async delete<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
    }
  ): Promise<TableType<T>> {
    return this.crud.delete(tableName, options);
  }

  /**
   * Delete many records - equivalent to Prisma's deleteMany
   */
  async deleteMany<T extends TableNames>(
    tableName: T,
    options?: {
      where?: WhereClause;
    }
  ): Promise<{ count: number }> {
    return this.crud.deleteMany(tableName, options);
  }

  /**
   * Count records - equivalent to Prisma's count
   */
  async count<T extends TableNames>(
    tableName: T,
    options?: {
      where?: WhereClause;
    }
  ): Promise<number> {
    return this.crud.count(tableName, options);
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
    }
  ): Promise<TableType<T>> {
    return this.crud.upsert(tableName, options);
  }

  /**
   * Paginated query with proper typing - enhanced version
   */
  async paginate<T extends TableNames>(
    tableName: T,
    paginationOptions: PaginationOptions,
    queryOptions?: {
      where?: WhereClause;
      select?: string;
      orderBy?: { field: string; direction: OrderDirection }[];
    }
  ): Promise<PaginatedResult<TableType<T>>> {
    return this.crud.paginate(tableName, paginationOptions, queryOptions);
  }

  // Utility methods for common operations

  /**
   * Execute RPC (Remote Procedure Call) functions
   */
  async rpc(functionName: string, params?: Record<string, any>) {
    const { data, error } = await this.client.rpc(functionName, params);
    if (error) {
      handleSupabaseError(error, `RPC ${functionName}`);
    }
    return data;
  }

  /**
   * Execute raw SQL queries (if needed for migration compatibility)
   * Note: This requires creating a PostgreSQL function that executes raw SQL
   */
  async rawQuery(sql: string, params?: any[]) {
    return this.rpc('execute_raw_query', {
      query: sql,
      parameters: params,
    });
  }

  /**
   * Helper method for safe single record queries (legacy support)
   */
  async findUniqueOrThrow<T>(
    query: Promise<{ data: T | null; error: unknown }>,
    errorMessage: string = 'Resource not found',
  ): Promise<T> {
    return executeQuery(query, errorMessage);
  }

  /**
   * Helper method for soft delete pattern (sets deleted_at timestamp)
   */
  async softDelete<T extends TableNames>(tableName: T, id: number): Promise<void> {
    await this.update(tableName, {
      where: { id },
      data: { deleted_at: new Date().toISOString() } as unknown as Partial<TableType<T>>,
    });
  }

  /**
   * Helper method to exclude soft-deleted records (for raw queries)
   */
  withoutDeleted<T>(query: T): T {
    return (query as any).is('deleted_at', null);
  }
}
